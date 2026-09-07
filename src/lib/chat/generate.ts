import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isEmergency,
  isHazardous,
  wrapHazardAnswer,
  SERVICE_CLOSE,
} from "@/lib/chat/hazards";
import {
  anthropicModel,
  readAnthropicApiKey,
} from "@/lib/chat/anthropic";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { searchManuals } from "@/lib/rag/search";
import type { AnswerResult, ChatMessage, Citation, RetrievedChunk } from "@/lib/rag/types";

const MIN_SCORE = 0.35;

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

function formatPassages(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "(no passages retrieved)";
  return chunks
    .map((c, i) => {
      const loc = c.page ? `p.${c.page}` : "page n/a";
      return `[${i + 1}] ${c.documentTitle} (${loc})\n${c.content}`;
    })
    .join("\n\n");
}

export function composeExtractiveAnswer(
  query: string,
  chunks: RetrievedChunk[],
): { body: string; missingManual: boolean } {
  if (!chunks.length || chunks[0].score < MIN_SCORE) {
    return {
      missingManual: true,
      body: `The loaded Cantek manuals do not contain a matching procedure for this question. Do not invent pressures, torque, amperage, or wiring. Contact Cantek service.\n\n${SERVICE_CLOSE}`,
    };
  }

  const steps = chunks.map((c, i) => {
    const loc = c.page ? `p.${c.page}` : "page n/a";
    return `${i + 1}. From ${c.documentTitle} (${loc}):\n${c.content}`;
  });

  return {
    missingManual: false,
    body: `Question understood: ${query.trim()}\n\nDocumented procedure:\n\n${steps.join("\n\n")}`,
  };
}

async function generateWithModel(
  locale: string,
  staffMode: boolean,
  messages: ChatMessage[],
  passages: string,
  signal?: AbortSignal,
): Promise<{
  text: string;
  model: string;
  provider: "anthropic" | "openai";
} | null> {
  const system = `${buildSystemPrompt({ locale, staffMode })}\n\nRETRIEVED PASSAGES:\n${passages}`;
  const anthropicApiKey = await readAnthropicApiKey();

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      const model = anthropicModel();
      const response = await client.messages.create({
        model,
        max_tokens: 2400,
        system,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }, { signal });
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("\n")
        .trim();
      if (text) return { text, model, provider: "anthropic" };
    } catch {
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      // Continue to the configured fallback provider or extractive RAG.
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o";
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "system", content: system }, ...messages],
      }, { signal });
      const text = response.choices[0]?.message?.content?.trim();
      if (text) return { text, model, provider: "openai" };
    } catch {
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      // Extractive RAG remains available when a provider is unavailable.
    }
  }

  return null;
}

export async function answerQuestion(opts: {
  messages: ChatMessage[];
  locale: string;
  staffMode: boolean;
  database?: SupabaseClient | null;
  signal?: AbortSignal;
}): Promise<AnswerResult> {
  if (opts.signal?.aborted) {
    throw new DOMException("Request cancelled", "AbortError");
  }
  const lastUser = [...opts.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const retrieved = await searchManuals(lastUser, {
    includeInternal: opts.staffMode,
    limit: 8,
    database: opts.database,
  });
  if (opts.signal?.aborted) {
    throw new DOMException("Request cancelled", "AbortError");
  }

  const hazard = isHazardous(lastUser);
  const emergency = isEmergency(lastUser);
  const hasGrounding = Boolean(
    retrieved.length && retrieved[0].score >= MIN_SCORE,
  );
  const grounded = hasGrounding ? retrieved : [];
  const citations = hazard || emergency ? [] : citationsFrom(grounded);
  const extractive = composeExtractiveAnswer(lastUser, retrieved);

  const generated = hazard || emergency || !hasGrounding
    ? null
    : await generateWithModel(
        opts.locale,
        opts.staffMode,
        opts.messages,
        formatPassages(grounded),
        opts.signal,
      );

  let answer: string;
  let missingManual: boolean;
  if (hazard || emergency) {
    answer = wrapHazardAnswer("", { hazard, emergency });
    missingManual = false;
  } else {
    answer = generated?.text ?? extractive.body;
    missingManual = extractive.missingManual && !generated;
    if (!answer.includes("Cantek service") && !answer.includes("+90 242")) {
      answer = `${answer.trim()}\n\n${SERVICE_CLOSE}`;
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
