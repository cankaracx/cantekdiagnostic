import { describe, expect, it } from "vitest";
import { composeExtractiveAnswer } from "@/lib/chat/generate";
import {
  DANGER_BLOCK,
  EMERGENCY_BLOCK,
  HAZARD_BOUNDARY,
  isEmergency,
  isHazardous,
  wrapHazardAnswer,
} from "@/lib/chat/hazards";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";

describe("hazard policy", () => {
  it("detects ammonia and welding as hazardous", () => {
    expect(isHazardous("how to weld ammonia pipework")).toBe(true);
    expect(isEmergency("there is an ammonia leak")).toBe(true);
  });

  it("replaces procedural content with an emergency safety boundary", () => {
    const wrapped = wrapHazardAnswer("1. Recover NH3 then weld per WPS.", {
      hazard: true,
      emergency: true,
    });
    expect(wrapped).toContain(DANGER_BLOCK);
    expect(wrapped).toContain(EMERGENCY_BLOCK);
    expect(wrapped).toContain(HAZARD_BOUNDARY);
    expect(wrapped).not.toContain("Recover NH3 then weld");
    expect(wrapped).toContain("+90 242 258 17 00");
  });
});

describe("grounding", () => {
  it("does not invent flange torque for a model that is not in the manuals", async () => {
    const query = "What is the ZX-9000 evaporator flange bolt torque in newton-metres?";
    const { body, missingManual } = composeExtractiveAnswer(query, []);
    expect(missingManual).toBe(true);
    expect(body).not.toMatch(/\b\d+\s*Nm\b/);
    expect(body).toMatch(/do not invent|not list|Contact Cantek|not contain/i);
  });
});

describe("system prompt", () => {
  it("requires a hazardous-work safety boundary and no invented specs", () => {
    const prompt = buildSystemPrompt({ locale: "en", staffMode: false });
    expect(prompt).toMatch(/SAFETY BOUNDARY/);
    expect(prompt).toMatch(/Do not provide step-by-step instructions/);
    expect(prompt).toMatch(/Do not invent/);
  });
});
