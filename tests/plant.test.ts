import { describe, expect, it } from "vitest";
import { localEmbedding } from "@/lib/rag/embed";
import { hybridRank } from "@/lib/rag/retrieve";
import {
  buildRetrievalQuery,
  conversationWindow,
  equipmentSearchTerm,
  parsePlantContext,
} from "@/lib/chat/plant";
import { isEmergency, isHazardous } from "@/lib/chat/hazards";
import type { ChunkRecord } from "@/lib/rag/types";

describe("plant job context", () => {
  it("accepts only known plant and fault identifiers", () => {
    expect(parsePlantContext({ equipment: "cold-room", fault: "high-pressure", serial: " OS-12 " })).toEqual({
      equipment: "cold-room",
      fault: "high-pressure",
      serial: "OS-12",
    });
    expect(
      parsePlantContext({
        equipment: "'; drop table documents --",
        fault: "not-a-fault",
        serial: "x".repeat(200),
      }),
    ).toEqual({ serial: "x".repeat(80) });
  });

  it("keeps follow-up questions tied to earlier plant symptoms", () => {
    const query = buildRetrievalQuery(
      [
        { role: "user", content: "Cold room not pulling down this afternoon." },
        { role: "assistant", content: "Check condenser air flow first." },
        { role: "user", content: "And the condenser fan?" },
      ],
      { equipment: "cold-room", fault: "pull-down", serial: "CR-441" },
    );

    expect(query).toContain("And the condenser fan?");
    expect(query).toContain("Cold room not pulling down");
    expect(query).toMatch(/cold room/i);
    expect(query).toContain("CR-441");
  });

  it("prepares alternating provider history that starts with the user", () => {
    const window = conversationWindow([
      { role: "assistant", content: "orphan reply" },
      { role: "user", content: "HP alarm" },
      { role: "user", content: "same rack as yesterday" },
      { role: "assistant", content: "Need the alarm code." },
      { role: "assistant", content: "Is it E12?" },
      { role: "user", content: "E12 on Octosense" },
    ]);

    expect(window[0]?.role).toBe("user");
    expect(window.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(window[0]?.content).toContain("HP alarm");
    expect(window[0]?.content).toContain("same rack as yesterday");
  });

  it("keeps an earlier ammonia emergency in later follow-up retrieval", () => {
    const query = buildRetrievalQuery([
      { role: "user", content: "there is an ammonia leak in the plant" },
      { role: "assistant", content: "Evacuate and call emergency services." },
      { role: "user", content: "how do I isolate the valve?" },
    ]);
    expect(isEmergency(query)).toBe(true);
    expect(isHazardous(query)).toBe(true);
  });
});

describe("equipment-aware ranking", () => {
  it("boosts manuals tagged for the selected plant family", () => {
    const query = "high pressure alarm";
    const embedding = localEmbedding(query);
    const chunks: ChunkRecord[] = [
      {
        id: "rack",
        documentId: "doc-rack",
        content: "High pressure alarm on the compressor rack.",
        page: 4,
        heading: "HP alarm",
        tokenCount: 12,
        embedding: localEmbedding("High pressure alarm on the compressor rack."),
        visibility: "repair",
        documentTitle: "Rack service",
        equipment: "cooling pack",
        language: "en",
      },
      {
        id: "room",
        documentId: "doc-room",
        content: "High pressure alarm on a cold room condenser.",
        page: 2,
        heading: "HP alarm",
        tokenCount: 12,
        embedding: localEmbedding("High pressure alarm on a cold room condenser."),
        visibility: "repair",
        documentTitle: "Cold room service",
        equipment: "cold room Octosense",
        language: "en",
      },
    ];

    const ranked = hybridRank(query, embedding, chunks, {
      includeInternal: false,
      equipment: equipmentSearchTerm("cold-room"),
    });

    expect(ranked[0]?.id).toBe("room");
  });
});
