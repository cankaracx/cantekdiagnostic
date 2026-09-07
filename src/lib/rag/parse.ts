import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ParsedPage = { page: number; text: string };

const MAX_EXTRACTED_CHARACTERS = 5_000_000;
const MAX_PDF_PAGES = 2_000;
const MAX_DOCX_ENTRIES = 5_000;
const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const ZIP_CENTRAL_HEADER = 0x02014b50;
const ZIP_END_HEADER = 0x06054b50;

function enforceExtractedTextLimit(pages: ParsedPage[]): ParsedPage[] {
  if (pages.length > MAX_PDF_PAGES) throw new Error("document_too_large");
  const total = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (total > MAX_EXTRACTED_CHARACTERS) {
    throw new Error("document_too_large");
  }
  return pages.filter((page) => page.text.length > 0);
}

function findZipEndOffset(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (
      buffer.readUInt32LE(offset) === ZIP_END_HEADER &&
      offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length
    ) {
      return offset;
    }
  }
  return -1;
}

function validateDocxArchive(buffer: Buffer): void {
  const endOffset = findZipEndOffset(buffer);
  if (endOffset < 0 || endOffset + 22 > buffer.length) {
    throw new Error("unsupported_file_type");
  }

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (
    entryCount === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    entryCount === 0 ||
    entryCount > MAX_DOCX_ENTRIES ||
    centralOffset + centralSize > endOffset
  ) {
    throw new Error("document_too_large");
  }

  let offset = centralOffset;
  let totalUncompressed = 0;
  let hasContentTypes = false;
  let hasDocumentXml = false;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== ZIP_CENTRAL_HEADER
    ) {
      throw new Error("unsupported_file_type");
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nextOffset =
      offset + 46 + nameLength + extraLength + commentLength;
    if (
      flags & 0x1 ||
      uncompressedSize === 0xffffffff ||
      compressedSize === 0xffffffff ||
      nextOffset > buffer.length
    ) {
      throw new Error("unsupported_file_type");
    }

    totalUncompressed += uncompressedSize;
    if (
      totalUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES ||
      (uncompressedSize > 10 * 1024 * 1024 &&
        uncompressedSize > Math.max(1, compressedSize) * 200)
    ) {
      throw new Error("document_too_large");
    }

    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8")
      .replaceAll("\\", "/");
    if (name.startsWith("/") || name.split("/").includes("..")) {
      throw new Error("unsupported_file_type");
    }
    hasContentTypes ||= name === "[Content_Types].xml";
    hasDocumentXml ||= name === "word/document.xml";
    offset = nextOffset;
  }

  if (!hasContentTypes || !hasDocumentXml) {
    throw new Error("unsupported_file_type");
  }
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (result.pages?.length) {
      return enforceExtractedTextLimit(
        result.pages.map((p) => ({
          page: p.num ?? 1,
          text: p.text ?? "",
        })),
      );
    }
    return enforceExtractedTextLimit([{ page: 1, text: result.text ?? "" }]);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function parseDocx(buffer: Buffer): Promise<ParsedPage[]> {
  validateDocxArchive(buffer);
  const { value } = await mammoth.extractRawText({ buffer });
  return enforceExtractedTextLimit([{ page: 1, text: value }]);
}

export function parsePlain(text: string): ParsedPage[] {
  const byHeading = text.split(/\n(?=##\s)/);
  if (byHeading.length > 1) {
    return enforceExtractedTextLimit(
      byHeading.map((block, i) => ({ page: i + 1, text: block.trim() })),
    );
  }
  return enforceExtractedTextLimit([{ page: 1, text }]);
}

export async function parseUpload(filename: string, buffer: Buffer): Promise<ParsedPage[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("unsupported_file_type");
    }
    return parsePdf(buffer);
  }
  if (lower.endsWith(".docx")) {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      ![0x03, 0x05, 0x07].includes(buffer[2] ?? -1)
    ) {
      throw new Error("unsupported_file_type");
    }
    return parseDocx(buffer);
  }
  if (buffer.includes(0)) throw new Error("unsupported_file_type");
  return parsePlain(buffer.toString("utf8"));
}
