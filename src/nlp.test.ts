import { describe, it, expect, beforeEach } from "vitest";
import { NLPEngine } from "./nlp.js";

describe("NLPEngine", () => {
  let engine: NLPEngine;

  beforeEach(() => {
    engine = new NLPEngine();
  });

  describe("Intent Recognition", () => {
    it("should recognize create intent", () => {
      const result = engine.process("create a chart");
      expect(result.intents[0].name).toBe("create_data");
    });

    it("should recognize display intent", () => {
      const result = engine.process("show me the chart");
      expect(result.intents[0].name).toBe("display");
    });

    it("should recognize calculate intent", () => {
      const result = engine.process("calculate the total");
      expect(result.intents[0].name).toBe("calculate");
    });

    it("should return unknown for unrecognized", () => {
      const result = engine.process("xyz random text");
      expect(result.action).toBe("unknown");
    });
  });

  describe("Code Generation", () => {
    it("should generate code for create data", () => {
      const result = engine.process("create json data");
      expect(result.code).toContain("omni:data");
    });

    it("should generate code for chart", () => {
      const result = engine.process("show bar chart");
      expect(result.code).toContain("omni:chart");
    });
  });

  describe("Multi-step Detection", () => {
    it("should detect then separator", () => {
      const result = engine.process("first do this then do that");
      expect(result.action).toBe("MULTI_STEP");
    });
  });

  describe("Learning from Corrections", () => {
    it("should learn correction", () => {
      engine.learnCorrection("show chart", "display chart");
      const corrections = engine.getLearnedCorrections();
      expect(corrections.size).toBeGreaterThan(0);
    });
  });

  describe("Context History", () => {
    it("should add to context history", () => {
      const result = engine.process("create data");
      engine.addToContext(result);
      const history = engine.getContextHistory();
      expect(history.length).toBe(1);
    });
  });
});

describe("NLPEngine Edge Cases", () => {
  let engine: NLPEngine;

  beforeEach(() => {
    engine = new NLPEngine();
  });

  it("should handle empty input", () => {
    const result = engine.process("");
    expect(result.action).toBe("unknown");
  });

  it("should handle multiple intents", () => {
    const result = engine.process("show chart and calculate sum");
    expect(result.intents.length).toBeGreaterThanOrEqual(1);
  });
});