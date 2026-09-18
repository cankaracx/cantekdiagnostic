import type { ChatMessage } from "@/lib/rag/types";

const SERIAL_UNSAFE = /[^\p{L}\p{N}/\-. ]+/gu;

export function sanitizeSerial(serial: string | undefined): string {
  return (serial ?? "")
    .trim()
    .replace(SERIAL_UNSAFE, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function conversationForModel(messages: ChatMessage[]): ChatMessage[] {
  const trimmed = messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content.slice(0, 4_000),
  }));
  const firstUser = trimmed.findIndex((message) => message.role === "user");
  if (firstUser < 0) return [];
  return trimmed.slice(firstUser);
}

export function composeLookupQuery(
  messages: ChatMessage[],
  serial?: string,
): string {
  const users = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const latest = users.at(-1) ?? "";
  const earlier = users.slice(-4, -1);
  const parts = [latest];
  if (earlier.length) {
    parts.push(`Earlier in this diagnostic: ${earlier.join(" | ")}`);
  }
  const cleanSerial = sanitizeSerial(serial);
  if (cleanSerial) {
    parts.push(`Model/serial ${cleanSerial}`);
  }
  return parts.join("\n").slice(0, 4_000);
}
