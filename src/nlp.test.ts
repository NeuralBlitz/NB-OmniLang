import { describe, it, expect, beforeEach } from "vitest";
import { NLPEngine } from "../nlp.js";

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

    it("should recognize filter intent", () => {
      const result = engine.process("filter users where age > 18");
      expect(result.intents[0].name).toBe("filter");
    });

    it("should recognize group intent", () => {
      const result = engine.process("group by category");
      expect(result.intents[0].name).toBe("group");
    });

    it("should recognize sort intent", () => {
      const result = engine.process("sort by name");
      expect(result.intents[0].name).toBe("sort");
    });

    it("should recognize load intent", () => {
      const result = engine.process("load data from file");
      expect(result.intents[0].name).toBe("load_data");
    });

    it("should recognize query intent", () => {
      const result = engine.process("what is the total");
      expect(result.intents[0].name).toBe("query");
    });

    it("should return unknown for unrecognized", () => {
      const result = engine.process("xyz random text");
      expect(result.action).toBe("unknown");
    });
  });

  describe("Entity Extraction", () => {
    it("should extract format entity", () => {
      const result = engine.process("show json data");
      const formatEntity = result.entities.find(e => e.type === "format");
      expect(formatEntity?.value).toBe("json");
    });

    it("should extract chart type entity", () => {
      const result = engine.process("show bar chart");
      const chartEntity = result.entities.find(e => e.type === "chart_type");
      expect(chartEntity?.value).toBe("bar");
    });

    it("should extract operation entity", () => {
      const result = engine.process("calculate average");
      const opEntity = result.entities.find(e => e.type === "operation");
      expect(opEntity?.value).toBe("average");
    });

    it("should extract number entity", () => {
      const result = engine.process("show 5 items");
      const numEntity = result.entities.find(e => e.type === "number");
      expect(numEntity?.value).toBe("5");
    });

    it("should extract comparison entity", () => {
      const result = engine.process("filter greater than 10");
      const compEntity = result.entities.find(e => e.type === "comparison");
      expect(compEntity?.value).toContain("greater");
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

    it("should generate code for compute", () => {
      const result = engine.process("calculate sum");
      expect(result.code).toContain("omni:compute");
    });
  });

  describe("Multi-step Detection", () => {
    it("should detect then separator", () => {
      const result = engine.process("first do this then do that");
      expect(result.action).toBe("MULTI_STEP");
    });

    it("should detect numbered steps", () => {
      const result = engine.process("1. load data 2. filter results");
      expect(result.action).toBe("MULTI_STEP");
    });
  });

  describe("Custom DSL Patterns", () => {
    it("should register custom DSL", () => {
      engine.registerDSL("custom", /custom-pattern/);
      const result = engine.process("use custom-pattern");
      expect(result.action).toBeDefined();
    });
  });

  describe("Learning from Corrections", () => {
    it("should learn correction", () => {
      engine.learnCorrection("show chart", "display chart");
      const corrections = engine.getLearnedCorrections();
      expect(corrections.size).toBeGreaterThan(0);
    });

    it("should apply corrections", () => {
      engine.learnCorrection("show chart", "display chart");
      const corrected = engine.applyCorrections("show chart now");
      expect(corrected).toContain("display");
    });
  });

  describe("Context History", () => {
    it("should add to context history", () => {
      const result = engine.process("create data");
      engine.addToContext(result);
      const history = engine.getContextHistory();
      expect(history.length).toBe(1);
    });

    it("should limit context history to 10", () => {
      for (let i = 0; i < 15; i++) {
        engine.addToContext(engine.process("test " + i));
      }
      const history = engine.getContextHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Explanation Generation", () => {
    it("should generate explanation for render", () => {
      const result = engine.process("show chart");
      expect(result.explanation).toBeDefined();
    });

    it("should generate explanation for compute", () => {
      const result = engine.process("calculate total");
      expect(result.explanation).toBeDefined();
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

  it("should handle very long input", () => {
    const longInput = "calculate " + "the total of ".repeat(100);
    const result = engine.process(longInput);
    expect(result.intents.length).toBeGreaterThan(0);
  });

  it("should handle multiple intents", () => {
    const result = engine.process("show chart and calculate sum");
    expect(result.intents.length).toBeGreaterThanOrEqual(2);
  });

  it("should prioritize by confidence", () => {
    const result = engine.process("create show calculate");
    if (result.intents.length > 1) {
      expect(result.intents[0].confidence).toBeGreaterThanOrEqual(result.intents[1].confidence);
    }
  });
});