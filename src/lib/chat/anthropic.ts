import Anthropic, {
  AuthenticationError,
  PermissionDeniedError,
} from "@anthropic-ai/sdk";
import { createServiceSupabase } from "@/lib/supabase/env";

const SECRET_NAME = "anthropic_api_key";
const CACHE_TTL_MS = 5 * 60 * 1000;

let keyCache: { value: string | null; expiresAt: number } | null = null;

export function anthropicModel(): string {
  return process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-5";
}

export function maskAnthropicKey(key: string): string {
  const suffix = key.slice(-4);
  return `sk-ant-…${suffix}`;
}

export function looksLikeAnthropicKey(key: string): boolean {
  return key.startsWith("sk-ant-") && key.length >= 24 && key.length <= 4096;
}

export async function readAnthropicApiKey(): Promise<string | null> {
  if (keyCache && keyCache.expiresAt > Date.now()) return keyCache.value;

  const service = createServiceSupabase();
  if (service) {
    const { data, error } = await service.rpc("get_app_secret", {
      secret_name: SECRET_NAME,
    });
    if (!error && typeof data === "string" && data.trim()) {
      const value = data.trim();
      keyCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    }
  }

  const envKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
  keyCache = { value: envKey, expiresAt: Date.now() + CACHE_TTL_MS };
  return envKey;
}

export async function testAnthropicApiKey(key: string): Promise<void> {
  if (!looksLikeAnthropicKey(key)) throw new Error("invalid_anthropic_key");

  try {
    const client = new Anthropic({ apiKey: key });
    await client.models.retrieve(anthropicModel());
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof PermissionDeniedError
    ) {
      throw new Error("invalid_anthropic_key");
    }
    throw new Error("anthropic_unavailable");
  }
}

export async function storeAnthropicApiKey(key: string): Promise<void> {
  const service = createServiceSupabase();
  if (!service) throw new Error("service_role_not_configured");

  const { error } = await service.rpc("set_app_secret", {
    secret_name: SECRET_NAME,
    secret_value: key,
  });
  if (error) throw new Error("secret_store_unavailable");

  keyCache = { value: key, expiresAt: Date.now() + CACHE_TTL_MS };
}
