import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/rag/chunk";
import { parsePlain } from "@/lib/rag/parse";

describe("RAG resource limits", () => {
  it("splits oversized unbroken and high-token blocks", () => {
    const chunks = chunkText(
      `${"word ".repeat(2_000)}\n\n${"x".repeat(15_000)}`,
    );

    expect(chunks.length).toBeGreaterThan(4);
    expect(chunks.every((chunk) => chunk.content.length <= 6_000)).toBe(true);
  });

  it("rejects plain text above the extracted-character limit", () => {
    expect(() => parsePlain("x".repeat(5_000_001))).toThrow(
      "document_too_large",
    );
  });
});
