import type { ChatMessage } from "@/lib/rag/types";

export const MAX_CHAT_MESSAGES = 16;
export const MAX_MESSAGE_CHARS = 4_000;
export const MAX_CONTEXT_CHARS = 24_000;

export function normalizeChatMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  const chronological: ChatMessage[] = [];
  for (const candidate of input.slice(-MAX_CHAT_MESSAGES * 2)) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      !("role" in candidate) ||
      !("content" in candidate)
    ) {
      continue;
    }

    const role = candidate.role;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof candidate.content !== "string") continue;
    const content = candidate.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;

    const previous = chronological.at(-1);
    if (previous && previous.role === role) {
      previous.content = `${previous.content}\n\n${content}`.slice(
        0,
        MAX_MESSAGE_CHARS,
      );
    } else {
      chronological.push({ role, content });
    }
  }

  while (chronological[0]?.role === "assistant") chronological.shift();

  const selected: ChatMessage[] = [];
  let usedChars = 0;
  for (const message of chronological.slice(-MAX_CHAT_MESSAGES).reverse()) {
    if (usedChars + message.content.length > MAX_CONTEXT_CHARS) continue;
    selected.unshift(message);
    usedChars += message.content.length;
  }

  while (selected[0]?.role === "assistant") selected.shift();
  return selected;
}
