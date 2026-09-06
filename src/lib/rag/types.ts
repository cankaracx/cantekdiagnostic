export const CANTEK_SERVICE = {
  phone: "+90 242 258 17 00",
  mobile: "+90 549 743 87 21",
  email: "info@cantekgroup.com",
};

export type Visibility = "repair" | "internal";

export type DocumentRecord = {
  id: string;
  title: string;
  filePath?: string;
  language: string;
  equipment?: string;
  refrigerant?: string;
  visibility: Visibility;
  version?: string;
  createdAt: string;
};

export type ChunkRecord = {
  id: string;
  documentId: string;
  content: string;
  page: number | null;
  heading: string | null;
  tokenCount: number;
  embedding: number[] | null;
  visibility: Visibility;
  documentTitle: string;
  equipment?: string;
  refrigerant?: string;
  language: string;
};

export type RetrievedChunk = ChunkRecord & {
  score: number;
  keywordHits: string[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type Citation = {
  documentTitle: string;
  page: number | null;
  chunkId: string;
};

export type AnswerResult = {
  answer: string;
  citations: Citation[];
  hazard: boolean;
  emergency: boolean;
  missingManual: boolean;
};
