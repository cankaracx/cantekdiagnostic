import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ChunkRecord, DocumentRecord } from "@/lib/rag/types";

export type LocalIndex = {
  documents: DocumentRecord[];
  chunks: ChunkRecord[];
};

function dataDir(): string {
  if (process.env.VERCEL) return path.join("/tmp", "cantek-diagnostic");
  return path.join(process.cwd(), "data");
}

const INDEX_PATH = path.join(dataDir(), "local-index.json");

export function indexPath(): string {
  return INDEX_PATH;
}

export function loadLocalIndex(): LocalIndex {
  if (!fs.existsSync(INDEX_PATH)) {
    return { documents: [], chunks: [] };
  }
  const raw = fs.readFileSync(INDEX_PATH, "utf8");
  return JSON.parse(raw) as LocalIndex;
}

export function saveLocalIndex(index: LocalIndex): void {
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

export function upsertDocument(
  index: LocalIndex,
  doc: Omit<DocumentRecord, "id" | "createdAt"> & { id?: string },
): DocumentRecord {
  const existing = doc.id ? index.documents.find((d) => d.id === doc.id) : undefined;
  const record: DocumentRecord = {
    id: existing?.id ?? doc.id ?? randomUUID(),
    title: doc.title,
    filePath: doc.filePath,
    language: doc.language,
    equipment: doc.equipment,
    refrigerant: doc.refrigerant,
    visibility: doc.visibility,
    version: doc.version,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  index.documents = index.documents.filter((d) => d.id !== record.id);
  index.chunks = index.chunks.filter((c) => c.documentId !== record.id);
  index.documents.push(record);
  return record;
}

export function addChunks(index: LocalIndex, chunks: ChunkRecord[]): void {
  index.chunks.push(...chunks);
}
