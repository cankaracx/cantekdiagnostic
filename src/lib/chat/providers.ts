import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createServiceSupabase } from "@/lib/supabase/env";
import type { ChatMessage } from "@/lib/rag/types";

export const AI_PROVIDER_IDS = [
  "anthropic",
  "openai",
  "google",
  "xai",
  "groq",
  "mistral",
  "openrouter",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

type ProviderDefinition = {
  id: AiProviderId;
  label: string;
  envKey: string;
  modelEnv: string;
  defaultModel: string;
  baseURL?: string;
  placeholder: string;
};

export const AI_PROVIDERS: readonly ProviderDefinition[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_CHAT_MODEL",
    defaultModel: "claude-sonnet-5",
    placeholder: "sk-ant-…",
  },
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    modelEnv: "OPENAI_CHAT_MODEL",
    defaultModel: "gpt-4o",
    placeholder: "sk-…",
  },
  {
    id: "google",
    label: "Google Gemini",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelEnv: "GOOGLE_CHAT_MODEL",
    defaultModel: "gemini-2.5-flash",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    placeholder: "AIza…",
  },
  {
    id: "xai",
    label: "xAI",
    envKey: "XAI_API_KEY",
    modelEnv: "XAI_CHAT_MODEL",
    defaultModel: "grok-3-mini",
    baseURL: "https://api.x.ai/v1",
    placeholder: "xai-…",
  },
  {
    id: "groq",
    label: "Groq",
    envKey: "GROQ_API_KEY",
    modelEnv: "GROQ_CHAT_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
    placeholder: "gsk_…",
  },
  {
    id: "mistral",
    label: "Mistral",
    envKey: "MISTRAL_API_KEY",
    modelEnv: "MISTRAL_CHAT_MODEL",
    defaultModel: "mistral-small-latest",
    baseURL: "https://api.mistral.ai/v1",
    placeholder: "API key",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_CHAT_MODEL",
    defaultModel: "openai/gpt-4o-mini",
    baseURL: "https://openrouter.ai/api/v1",
    placeholder: "sk-or-v1-…",
  },
];

const providerById = new Map(AI_PROVIDERS.map((provider) => [provider.id, provider]));
const PRESENT_CACHE_TTL_MS = 60_000;
const PROVIDER_TIMEOUT_MS = 20_000;
const credentialCache = new Map<
  AiProviderId,
  { key: string | null; model: string; source: "stored" | "environment" | null; expiresAt: number }
>();

export type ProviderStatus = {
  id: AiProviderId;
  label: string;
  configured: boolean;
  hint: string | null;
  model: string;
  source: "stored" | "environment" | null;
  placeholder: string;
};

export type ProviderGeneration = {
  text: string;
  model: string;
  provider: AiProviderId;
};

function definition(provider: AiProviderId): ProviderDefinition {
  const value = providerById.get(provider);
  if (!value) throw new Error("unsupported_provider");
  return value;
}

export function isAiProviderId(value: unknown): value is AiProviderId {
  return (
    typeof value === "string" &&
    (AI_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

function secretName(provider: AiProviderId, kind: "key" | "model"): string {
  return `ai_${provider}_${kind}`;
}

async function readStoredSecret(name: string): Promise<string | null> {
  const service = createServiceSupabase();
  if (!service) return null;
  const { data, error } = await service.rpc("get_app_secret", {
    secret_name: name,
  });
  if (error || typeof data !== "string" || !data.trim()) return null;
  return data.trim();
}

async function readStoredSecrets(names: string[]): Promise<Map<string, string>> {
  const service = createServiceSupabase();
  if (!service) return new Map();

  const { data, error } = await service.rpc("get_app_secrets", {
    secret_names: names,
  });
  if (!error && data && typeof data === "object" && !Array.isArray(data)) {
    return new Map(
      Object.entries(data as Record<string, unknown>).flatMap(([name, value]) =>
        typeof value === "string" && value.trim()
          ? [[name, value.trim()] as const]
          : [],
      ),
    );
  }

  const fallback = await Promise.all(
    names.map(async (name) => [name, await readStoredSecret(name)] as const),
  );
  return new Map(
    fallback.flatMap(([name, value]) =>
      value ? [[name, value] as const] : [],
    ),
  );
}

async function writeStoredSecret(name: string, value: string): Promise<void> {
  const service = createServiceSupabase();
  if (!service) throw new Error("service_role_not_configured");
  const { error } = await service.rpc("set_app_secret", {
    secret_name: name,
    secret_value: value,
  });
  if (error) throw new Error("secret_store_unavailable");
}

async function deleteStoredSecret(name: string): Promise<void> {
  const service = createServiceSupabase();
  if (!service) throw new Error("service_role_not_configured");
  const { error } = await service.rpc("delete_app_secret", {
    secret_name: name,
  });
  if (error) throw new Error("secret_store_unavailable");
}

async function readCredential(provider: AiProviderId): Promise<{
  key: string | null;
  model: string;
  source: "stored" | "environment" | null;
}> {
  const cached = credentialCache.get(provider);
  if (cached && cached.expiresAt > Date.now()) {
    return { key: cached.key, model: cached.model, source: cached.source };
  }

  const config = definition(provider);
  const [storedKey, storedModel, legacyAnthropicKey] = await Promise.all([
    readStoredSecret(secretName(provider, "key")),
    readStoredSecret(secretName(provider, "model")),
    provider === "anthropic"
      ? readStoredSecret("anthropic_api_key")
      : Promise.resolve(null),
  ]);
  const databaseKey = storedKey ?? legacyAnthropicKey;
  const environmentKey = process.env[config.envKey]?.trim() || null;
  const key = databaseKey ?? environmentKey;
  const model =
    storedModel ??
    process.env[config.modelEnv]?.trim() ??
    config.defaultModel;
  const source = databaseKey
    ? "stored"
    : environmentKey
      ? "environment"
      : null;

  rememberCredential(provider, { key, model, source });
  return { key, model, source };
}

function rememberCredential(
  provider: AiProviderId,
  credential: {
    key: string | null;
    model: string;
    source: "stored" | "environment" | null;
  },
): void {
  if (!credential.key) {
    credentialCache.delete(provider);
    return;
  }

  credentialCache.set(provider, {
    ...credential,
    expiresAt: Date.now() + PRESENT_CACHE_TTL_MS,
  });
}

export async function readProviderApiKey(
  provider: AiProviderId,
): Promise<string | null> {
  return (await readCredential(provider)).key;
}

export async function readProviderModel(
  provider: AiProviderId,
): Promise<string> {
  return (await readCredential(provider)).model;
}

export function maskProviderKey(key: string): string {
  if (key.length < 9) return "••••";
  return `${key.slice(0, Math.min(7, key.length - 4))}…${key.slice(-4)}`;
}

export function looksLikeProviderKey(
  provider: AiProviderId,
  key: string,
): boolean {
  if (key.length < 16 || key.length > 4096 || /\s/.test(key)) return false;
  if (provider === "anthropic") return key.startsWith("sk-ant-");
  if (provider === "google") return key.startsWith("AIza");
  if (provider === "xai") return key.startsWith("xai-");
  if (provider === "groq") return key.startsWith("gsk_");
  if (provider === "openrouter") return key.startsWith("sk-or-");
  if (provider === "openai") return key.startsWith("sk-");
  return true;
}

function openAiClient(config: ProviderDefinition, key: string): OpenAI {
  return new OpenAI({
    apiKey: key,
    baseURL: config.baseURL,
    maxRetries: 0,
    timeout: PROVIDER_TIMEOUT_MS,
    defaultHeaders:
      config.id === "openrouter"
        ? {
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://cantekgroup.com",
            "X-Title": "Cantek Diagnostics",
          }
        : undefined,
  });
}

function selectModel(provider: AiProviderId, ids: string[]): string | null {
  const filtered = ids.filter((id) => {
    const model = id.toLowerCase();
    if (
      /embed|moderation|whisper|audio|realtime|transcri|speech|tts|image|guard|rerank/.test(
        model,
      )
    ) {
      return false;
    }
    if (provider === "anthropic") return /claude/.test(model);
    if (provider === "openai") return /^gpt-/.test(model) && !/instruct/.test(model);
    if (provider === "google") return /gemini/.test(model);
    if (provider === "xai") return /grok/.test(model);
    if (provider === "groq") return /llama|qwen|gemma|mistral/.test(model);
    if (provider === "mistral") return /mistral|ministral|codestral/.test(model);
    return true;
  });

  const preferences: Partial<Record<AiProviderId, string[]>> = {
    anthropic: ["sonnet", "haiku", "opus"],
    openai: ["gpt-4.1", "gpt-4o", "gpt-5"],
    google: ["flash", "pro"],
    xai: ["grok-3-mini", "grok-3", "grok"],
    groq: ["llama-3.3-70b-versatile", "llama", "qwen"],
    mistral: ["mistral-small", "ministral", "mistral"],
    openrouter: [
      "openai/gpt-4o-mini",
      "google/gemini-2.5-flash",
      "anthropic/claude",
    ],
  };
  const preference = preferences[provider] ?? [];
  for (const term of preference) {
    const match = filtered.find((id) => id.toLowerCase().includes(term));
    if (match) return match;
  }
  return filtered[0] ?? null;
}

function providerErrorCode(error: unknown): string {
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
  return status === 401 || status === 403
    ? "invalid_provider_key"
    : "provider_unavailable";
}

async function listProviderModels(
  provider: AiProviderId,
  key: string,
): Promise<string[]> {
  if (provider === "anthropic") {
    const page = await new Anthropic({
      apiKey: key,
      maxRetries: 0,
      timeout: PROVIDER_TIMEOUT_MS,
    }).models.list({ limit: 100 });
    return page.data.map((item) => item.id);
  }

  const page = await openAiClient(definition(provider), key).models.list();
  return page.data.map((item) => item.id);
}

async function probeDefaultModel(
  provider: AiProviderId,
  key: string,
): Promise<string> {
  const config = definition(provider);
  const model = config.defaultModel;
  const probe = "Reply with ok.";

  if (provider === "anthropic") {
    await new Anthropic({
      apiKey: key,
      maxRetries: 0,
      timeout: PROVIDER_TIMEOUT_MS,
    }).messages.create({
      model,
      max_tokens: 8,
      messages: [{ role: "user", content: probe }],
    });
    return model;
  }

  await openAiClient(config, key).chat.completions.create({
    model,
    max_tokens: 8,
    messages: [{ role: "user", content: probe }],
  });
  return model;
}

export async function testProviderApiKey(
  provider: AiProviderId,
  key: string,
): Promise<string> {
  if (!looksLikeProviderKey(provider, key)) {
    throw new Error("invalid_provider_key");
  }

  try {
    try {
      const ids = await listProviderModels(provider, key);
      const selected = selectModel(provider, ids);
      if (selected) return selected;
    } catch (error) {
      if (providerErrorCode(error) === "invalid_provider_key") {
        throw new Error("invalid_provider_key");
      }
    }

    return await probeDefaultModel(provider, key);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "invalid_provider_key" ||
        error.message === "provider_unavailable")
    ) {
      throw error;
    }
    throw new Error(providerErrorCode(error));
  }
}

export async function storeProviderCredential(
  provider: AiProviderId,
  key: string,
  model: string,
): Promise<void> {
  await writeStoredSecret(secretName(provider, "model"), model);
  await writeStoredSecret(secretName(provider, "key"), key);
  rememberCredential(provider, { key, model, source: "stored" });
}

export async function removeProviderCredential(
  provider: AiProviderId,
): Promise<void> {
  const names = [
    secretName(provider, "key"),
    secretName(provider, "model"),
    ...(provider === "anthropic" ? ["anthropic_api_key"] : []),
  ];
  await Promise.all(names.map(deleteStoredSecret));
  credentialCache.delete(provider);
}

export async function listProviderStatuses(): Promise<ProviderStatus[]> {
  const names = AI_PROVIDERS.flatMap((provider) => [
    secretName(provider.id, "key"),
    secretName(provider.id, "model"),
  ]);
  names.push("anthropic_api_key");
  const stored = await readStoredSecrets(names);

  return AI_PROVIDERS.map((provider) => {
    const databaseKey =
      stored.get(secretName(provider.id, "key")) ??
      (provider.id === "anthropic"
        ? stored.get("anthropic_api_key")
        : undefined);
    const environmentKey = process.env[provider.envKey]?.trim() || null;
    const key = databaseKey ?? environmentKey;
    const model =
      stored.get(secretName(provider.id, "model")) ??
      process.env[provider.modelEnv]?.trim() ??
      provider.defaultModel;
    const source = databaseKey
      ? "stored"
      : environmentKey
        ? "environment"
        : null;

    rememberCredential(provider.id, { key, model, source });
    return {
      id: provider.id,
      label: provider.label,
      configured: Boolean(key),
      hint: key ? maskProviderKey(key) : null,
      model,
      source,
      placeholder: provider.placeholder,
    };
  });
}

async function generateFromProvider(
  provider: AiProviderId,
  key: string,
  model: string,
  system: string,
  messages: ChatMessage[],
): Promise<string> {
  if (provider === "anthropic") {
    const response = await new Anthropic({
      apiKey: key,
      maxRetries: 0,
      timeout: PROVIDER_TIMEOUT_MS,
    }).messages.create({
      model,
      max_tokens: 2400,
      system,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });
    return response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();
  }

  const response = await openAiClient(definition(provider), key).chat.completions.create({
    model,
    max_tokens: 2400,
    messages: [{ role: "system", content: system }, ...messages],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

export async function generateWithProviders(opts: {
  system: string;
  messages: ChatMessage[];
  allowFailover?: boolean;
}): Promise<ProviderGeneration | null> {
  const startedAt = Date.now();
  const maxAttempts = opts.allowFailover === false ? 1 : 3;
  let attempts = 0;
  for (const provider of AI_PROVIDERS) {
    if (Date.now() - startedAt > 50_000 || attempts >= maxAttempts) break;
    const credential = await readCredential(provider.id);
    if (!credential.key) continue;
    attempts += 1;

    try {
      const text = await generateFromProvider(
        provider.id,
        credential.key,
        credential.model,
        opts.system,
        opts.messages,
      );
      if (text) {
        return {
          text,
          model: credential.model,
          provider: provider.id,
        };
      }
    } catch {
      // Continue in priority order so one unavailable provider does not
      // interrupt diagnostics when another configured provider can answer.
    }
  }
  return null;
}
