import { describe, expect, it } from "vitest";
import { buildRetrievalQuery, toProviderMessages } from "@/lib/chat/context";
import {
  composePlantLookup,
  hasPlantInput,
  parseTemp,
  pullDownGap,
} from "@/lib/chat/plant";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";

describe("plant readings", () => {
  it("rejects out-of-range and malformed temperatures", () => {
    expect(parseTemp("")).toBeNull();
    expect(parseTemp("abc")).toBeNull();
    expect(parseTemp("120")).toBeNull();
    expect(parseTemp("-18,5")).toBe(-18.5);
    expect(parseTemp("8.0")).toBe(8);
  });

  it("composes an Octosense lookup that keeps pull-down gap and output state", () => {
    const readings = {
      roomC: 8,
      setpointC: -18,
      evaporatorC: -6,
      compressor: true,
      evaporatorFans: true,
      defrost: false,
      doorOpen: false,
      observation: "pullDown" as const,
    };

    expect(pullDownGap(readings)).toBe(26);
    expect(hasPlantInput(readings)).toBe(true);

    const query = composePlantLookup(readings, "Not pulling down");
    expect(query).toMatch(/Octosense cold room readings/);
    expect(query).toMatch(/room air 8\.0 C/);
    expect(query).toMatch(/setpoint -18\.0 C/);
    expect(query).toMatch(/26\.0 K above setpoint/);
    expect(query).toMatch(/compressor running/);
    expect(query).toMatch(/defrost idle/);
    expect(query).toMatch(/observed Not pulling down/);
  });
});

describe("conversation retrieval", () => {
  it("keeps prior plant context when the follow-up is short", () => {
    const query = buildRetrievalQuery(
      [
        {
          role: "user",
          content:
            "Octosense cold room readings. room air 8.0 C. setpoint -18.0 C. Not pulling down.",
        },
        {
          role: "assistant",
          content: "Check door heaters and evaporator airflow.",
        },
        { role: "user", content: "What about the condenser?" },
      ],
      "CR-18/42",
    );

    expect(query).toMatch(/room air 8\.0 C/);
    expect(query).toMatch(/What about the condenser\?/);
    expect(query).toMatch(/model\/serial CR-18\/42/);
  });

  it("sends alternating provider turns ending on the latest user question", () => {
    const messages = toProviderMessages([
      { role: "assistant", content: "orphan reply" },
      { role: "user", content: "Room not pulling down" },
      { role: "assistant", content: "Is the door closed?" },
      { role: "user", content: "Yes, door closed" },
      { role: "assistant", content: "trailing assistant" },
    ]);

    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(messages.at(-1)?.content).toBe("Yes, door closed");
  });
});

describe("system prompt plant context", () => {
  it("tells the model to treat earlier turns as plant context", () => {
    const prompt = buildSystemPrompt({ locale: "en", staffMode: false });
    expect(prompt).toMatch(/Earlier user turns are plant context/);
  });
});
