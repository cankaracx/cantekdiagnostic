import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isEmergency,
  isHazardous,
  serviceClose,
  wrapHazardAnswer,
} from "@/lib/chat/hazards";
import { localizedChatCopy } from "@/lib/chat/localized";
import { generateWithProviders } from "@/lib/chat/providers";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { searchManuals } from "@/lib/rag/search";
import { isDocumentationRequest } from "@/lib/rag/retrieve";
import type { AnswerResult, ChatMessage, Citation, RetrievedChunk } from "@/lib/rag/types";

const MIN_SCORE = 0.35;
const UNSAFE_REFERENCE_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;

function escapeReference(value: string): string {
  return value
    .replace(UNSAFE_REFERENCE_CHARACTERS, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function citationsFrom(chunks: RetrievedChunk[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const chunk of chunks) {
    const key = `${chunk.documentTitle}:${chunk.page ?? "?"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      documentTitle: chunk.documentTitle,
      page: chunk.page,
      chunkId: chunk.id,
    });
  }
  return out;
}

export function formatPassages(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "(no passages retrieved)";
  return chunks
    .map((c, i) => {
      const loc = c.page ? `p.${c.page}` : "page n/a";
      return [
        `<retrieved_reference index="${i + 1}" page="${loc}">`,
        `<title>${escapeReference(c.documentTitle)}</title>`,
        `<content>${escapeReference(c.content.slice(0, 8_000))}</content>`,
        "</retrieved_reference>",
      ].join("\n");
    })
    .join("\n\n");
}

export function composeExtractiveAnswer(
  _query: string,
  chunks: RetrievedChunk[],
  locale = "en",
): { body: string; missingManual: boolean } {
  const copy = localizedChatCopy(locale);
  if (!chunks.length || chunks[0].score < MIN_SCORE) {
    return {
      missingManual: true,
      body: `${copy.noDocs}\n\n${serviceClose(locale)}`,
    };
  }

  const steps = chunks.map((c, i) => {
    const location = c.page
      ? `${copy.page}${c.page}`
      : copy.pageUnknown;
    return `${i + 1}. ${c.content}\n\n${copy.source}: ${c.documentTitle} (${location})`;
  });

  return {
    missingManual: false,
    body: `${copy.title}\n\n${steps.join("\n\n")}`,
  };
}

async function generateWithModel(
  locale: string,
  staffMode: boolean,
  messages: ChatMessage[],
  passages: string,
): Promise<{
  text: string;
  model: string;
  provider:
    | "anthropic"
    | "openai"
    | "google"
    | "xai"
    | "groq"
    | "mistral"
    | "openrouter";
} | null> {
  const system = `${buildSystemPrompt({
    locale,
    staffMode,
    documentationRequested: isDocumentationRequest(
      messages.at(-1)?.content ?? "",
    ),
  })}\n\nRETRIEVED PASSAGES:\n${passages}`;
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  if (!lastUserMessage) return null;

  return generateWithProviders({
    system,
    messages: [{ role: "user", content: lastUserMessage.content.slice(0, 8_000) }],
    allowFailover: !staffMode,
  });
}

export async function answerQuestion(opts: {
  messages: ChatMessage[];
  locale: string;
  staffMode: boolean;
  database?: SupabaseClient | null;
}): Promise<AnswerResult> {
  const lastUser = [...opts.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const retrieved = await searchManuals(lastUser, {
    includeInternal: opts.staffMode,
    limit: 8,
    database: opts.database,
  });

  const hazard = isHazardous(lastUser);
  const emergency = isEmergency(lastUser);
  const hasGrounding = Boolean(
    retrieved.length && retrieved[0].score >= MIN_SCORE,
  );
  const grounded = hasGrounding ? retrieved : [];
  const citations = hazard || emergency ? [] : citationsFrom(grounded);
  const extractive = composeExtractiveAnswer(lastUser, retrieved, opts.locale);

  const generated = hazard || emergency || !hasGrounding
    ? null
    : await generateWithModel(
        opts.locale,
        opts.staffMode,
        opts.messages,
        formatPassages(grounded),
      );

  let answer: string;
  let missingManual: boolean;
  if (hazard || emergency) {
    answer = wrapHazardAnswer("", {
      hazard,
      emergency,
      locale: opts.locale,
    });
    missingManual = false;
  } else {
    answer = generated?.text ?? extractive.body;
    missingManual = extractive.missingManual && !generated;
    if (!answer.includes("+90 242") && !answer.includes("info@cantekgroup.com")) {
      answer = `${answer.trim()}\n\n${serviceClose(opts.locale)}`;
    }
  }

  return {
    answer,
    citations,
    hazard,
    emergency,
    missingManual,
    provider: hazard || emergency
      ? "safety"
      : generated?.provider ?? "extractive",
  };
}
