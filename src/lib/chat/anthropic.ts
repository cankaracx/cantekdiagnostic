import {
  looksLikeProviderKey,
  maskProviderKey,
  readProviderApiKey,
  readProviderModel,
  storeProviderCredential,
  testProviderApiKey,
} from "@/lib/chat/providers";

export function anthropicModel(): string {
  return process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-5";
}

export function maskAnthropicKey(key: string): string {
  return maskProviderKey(key);
}

export function looksLikeAnthropicKey(key: string): boolean {
  return looksLikeProviderKey("anthropic", key);
}

export async function readAnthropicApiKey(): Promise<string | null> {
  return readProviderApiKey("anthropic");
}

export async function testAnthropicApiKey(key: string): Promise<void> {
  await testProviderApiKey("anthropic", key);
}

export async function storeAnthropicApiKey(key: string): Promise<void> {
  const model = await readProviderModel("anthropic");
  await storeProviderCredential("anthropic", key, model);
}
