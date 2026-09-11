import type { ChatMessage } from "@/lib/rag/types";

const MAX_MESSAGES = 8;
const PRIOR_USER_CHARS = 400;

export function recentConversation(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, message.role === "user" ? 4_000 : 2_000),
    }))
    .slice(-MAX_MESSAGES);
}

export function buildRetrievalQuery(
  messages: ChatMessage[],
  serial?: string,
): string {
  const users = recentConversation(messages).filter(
    (message) => message.role === "user",
  );
  if (!users.length) return "";

  const prior = users
    .slice(0, -1)
    .map((message) => message.content.slice(0, PRIOR_USER_CHARS));
  const current = users.at(-1)!.content;
  const serialNote =
    typeof serial === "string" && serial.trim()
      ? `model/serial ${serial.trim().slice(0, 80)}`
      : "";

  return [...prior, current, serialNote].filter(Boolean).join("\n");
}

export function toProviderMessages(messages: ChatMessage[]): ChatMessage[] {
  const compact: ChatMessage[] = [];

  for (const message of recentConversation(messages)) {
    const last = compact.at(-1);
    if (last && last.role === message.role) {
      last.content = `${last.content}\n${message.content}`.slice(0, 8_000);
      continue;
    }
    compact.push({ role: message.role, content: message.content });
  }

  while (compact[0]?.role === "assistant") compact.shift();
  while (compact.at(-1)?.role === "assistant") compact.pop();

  return compact.map((message) => ({
    role: message.role,
    content: message.content.slice(0, message.role === "user" ? 8_000 : 1_500),
  }));
}
