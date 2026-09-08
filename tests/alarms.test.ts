import { describe, expect, it } from "vitest";
import { localEmbedding } from "@/lib/rag/embed";
import { hybridRank } from "@/lib/rag/retrieve";
import {
  composeFaultQuery,
  excerptManualPassage,
  extractAlarmTokens,
  normalizeAlarmCode,
} from "@/lib/rag/alarms";
import type { ChunkRecord } from "@/lib/rag/types";

function chunk(
  id: string,
  content: string,
  extra: Partial<ChunkRecord> = {},
): ChunkRecord {
  return {
    id,
    documentId: "doc-1",
    content,
    page: 12,
    heading: "Alarms",
    tokenCount: 40,
    embedding: null,
    visibility: "repair",
    documentTitle: "Octosense service",
    language: "en",
    ...extra,
  };
}

describe("controller alarm tokens", () => {
  it("reads Carel-style display codes without treating defrost as DEF", () => {
    expect(extractAlarmTokens("HP alarm and LP trip, also E0 and CHT")).toEqual(
      ["HP", "LP", "E0", "CHT"],
    );
    expect(extractAlarmTokens("Ed1 defrost timeout")).toEqual(["ED1"]);
    expect(extractAlarmTokens("the evaporator is in defrost")).toEqual([]);
  });

  it("normalizes typed display codes", () => {
    expect(normalizeAlarmCode(" hp-12 ")).toBe("HP12");
    expect(normalizeAlarmCode("e0")).toBe("E0");
  });

  it("composes a lookup that still contains the display token", () => {
    const query = composeFaultQuery(["hp"], "e0", {
      hp: "High-pressure HP alarm on a Cantek plant.",
      lp: "Low-pressure LP alarm.",
      hi: "High-temperature HI alarm.",
      defrost: "DEF showing on the display.",
      code: "Controller alarm code {code} on a Cantek plant.",
    });
    expect(query).toContain("HP");
    expect(query).toContain("E0");
    expect(extractAlarmTokens(query)).toEqual(["HP", "E0"]);
  });

  it("strips bidi marks from manual excerpts and keeps them short", () => {
    const excerpt = excerptManualPassage(
      `Reset HP\u202e alarm after checking condenser airflow. ${"word ".repeat(80)}`,
      80,
    );
    expect(excerpt).toContain("Reset HP alarm");
    expect(excerpt).not.toContain("\u202e");
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThan(90);
  });
});

describe("alarm ranking", () => {
  it("ranks a matching HP procedure above an unrelated compressor note", () => {
    const ranked = hybridRank(
      "HP alarm on the rack",
      localEmbedding("HP alarm on the rack"),
      [
        chunk("oil", "Check compressor oil sight glass weekly during routine inspection."),
        chunk(
          "hp",
          "HP high-pressure alarm: inspect condenser fans and inlet air before calling service.",
        ),
      ],
      { includeInternal: false, limit: 4 },
    );
    expect(ranked[0]?.id).toBe("hp");
    expect(ranked[0]?.keywordHits).toContain("HP");
  });
});
