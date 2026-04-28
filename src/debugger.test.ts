import { describe, it, expect, beforeEach, vi } from "vitest";
import { OmniDebugger } from "./debugger.js";

describe("OmniDebugger", () => {
  let debugger_: OmniDebugger;

  beforeEach(() => {
    debugger_ = new OmniDebugger();
  });

  describe("Breakpoints", () => {
    it("should set breakpoint", () => {
      const bp = debugger_.setBreakpoint("test.ts", 10);
      expect(bp.line).toBe(10);
    });

    it("should set breakpoint with condition", () => {
      const bp = debugger_.setBreakpoint("test.ts", 10, "x > 5");
      expect(bp.condition).toBe("x > 5");
    });

    it("should remove breakpoint", () => {
      const bp = debugger_.setBreakpoint("test.ts", 10);
      debugger_.removeBreakpoint(bp.id);
      const all = debugger_.getBreakpoints("test.ts");
      expect(all.length).toBe(0);
    });

    it("should get breakpoints for file", () => {
      debugger_.setBreakpoint("test.ts", 10);
      debugger_.setBreakpoint("test.ts", 20);
      debugger_.setBreakpoint("other.ts", 5);
      const bps = debugger_.getBreakpoints("test.ts");
      expect(bps.length).toBe(2);
    });

    it("should toggle breakpoint", () => {
      const bp = debugger_.setBreakpoint("test.ts", 10);
      debugger_.toggleBreakpoint(bp.id);
      const toggled = debugger_.getBreakpoint(bp.id);
      expect(toggled?.enabled).toBe(false);
    });
  });

  describe("Watch Expressions", () => {
    it("should add watch", () => {
      const watch = debugger_.addWatch("x + y");
      expect(watch.expression).toBe("x + y");
    });

    it("should remove watch", () => {
      const watch = debugger_.addWatch("count");
      debugger_.removeWatch(watch.id);
      const watches = debugger_.getWatches();
      expect(watches.length).toBe(0);
    });

    it("should evaluate watch", () => {
      debugger_.addWatch("total");
      const result = debugger_.evaluate("total", { total: 42 });
      expect(result.success).toBe(true);
    });
  });

  describe("Execution Control", () => {
    it("should start debugging", () => {
      debugger_.start("test.ts", { x: 1 });
      expect(debugger_.isRunning()).toBe(true);
    });

    it("should pause execution", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.pause();
      expect(debugger_.isPaused()).toBe(true);
    });

    it("should continue execution", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.pause();
      debugger_.continue();
      expect(debugger_.isRunning()).toBe(true);
    });

    it("should step over", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.stepOver();
      expect(debugger_.isPaused()).toBe(true);
    });

    it("should step out", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.stepOut();
      expect(debugger_.isPaused()).toBe(true);
    });

    it("should step into", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.stepInto();
      expect(debugger_.isPaused()).toBe(true);
    });

    it("should stop execution", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.stop();
      expect(debugger_.isRunning()).toBe(false);
    });
  });

  describe("Execution Frames", () => {
    it("should push frame", () => {
      debugger_.pushFrame("func1", { x: 1 });
      const frames = debugger_.getCallStack();
      expect(frames.length).toBe(1);
    });

    it("should pop frame", () => {
      debugger_.pushFrame("func1", { x: 1 });
      debugger_.popFrame();
      const frames = debugger_.getCallStack();
      expect(frames.length).toBe(0);
    });

    it("should get current frame", () => {
      debugger_.pushFrame("func1", { x: 1 });
      debugger_.pushFrame("func2", { y: 2 });
      const current = debugger_.getCurrentFrame();
      expect(current?.name).toBe("func2");
    });
  });

  describe("Scope Variables", () => {
    it("should get locals", () => {
      debugger_.start("test.ts", { x: 1, y: 2 });
      const locals = debugger_.getLocals();
      expect(locals.x).toBe(1);
    });

    it("should update variable", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.updateVariable("x", 5);
      const locals = debugger_.getLocals();
      expect(locals.x).toBe(5);
    });
  });

  describe("Hit Conditions", () => {
    it("should set hit condition", () => {
      const bp = debugger_.setBreakpoint("test.ts", 10);
      debugger_.setHitCondition(bp.id, 3, ">=");
      const updated = debugger_.getBreakpoint(bp.id);
      expect(updated?.hitCondition).toBeDefined();
    });
  });

  describe("Logging", () => {
    it("should log step", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.logStep();
      const logs = debugger_.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it("should clear logs", () => {
      debugger_.start("test.ts", { x: 1 });
      debugger_.logStep();
      debugger_.clearLogs();
      const logs = debugger_.getLogs();
      expect(logs.length).toBe(0);
    });
  });
});

describe("OmniDebugger Options", () => {
  it("should accept timeout option", () => {
    const dbg = new OmniDebugger({ timeout: 5000 });
    expect(dbg).toBeDefined();
  });

  it("should accept onBreak option", () => {
    const onBreak = vi.fn();
    const dbg = new OmniDebugger({ onBreak });
    expect(dbg).toBeDefined();
  });
});