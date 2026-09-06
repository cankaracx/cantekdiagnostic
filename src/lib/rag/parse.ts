import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ParsedPage = { page: number; text: string };

export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (result.pages?.length) {
      return result.pages.map((p) => ({
        page: p.num ?? 1,
        text: p.text ?? "",
      }));
    }
    return [{ page: 1, text: result.text ?? "" }];
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function parseDocx(buffer: Buffer): Promise<ParsedPage[]> {
  const { value } = await mammoth.extractRawText({ buffer });
  return [{ page: 1, text: value }];
}

export function parsePlain(text: string): ParsedPage[] {
  const byHeading = text.split(/\n(?=##\s)/);
  if (byHeading.length > 1) {
    return byHeading.map((block, i) => ({ page: i + 1, text: block.trim() }));
  }
  return [{ page: 1, text }];
}

export async function parseUpload(filename: string, buffer: Buffer): Promise<ParsedPage[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return parsePdf(buffer);
  if (lower.endsWith(".docx")) return parseDocx(buffer);
  return parsePlain(buffer.toString("utf8"));
}
