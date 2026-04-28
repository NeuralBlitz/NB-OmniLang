export class OmniDebugger {
  breakpoints = /* @__PURE__ */ new Map();
  watchExpressions = /* @__PURE__ */ new Map();
  enabled = false;
  pauseOnExceptions = true;
  stepMode = "over";
  paused = false;
  pauseReason;
  hitCounts = /* @__PURE__ */ new Map();
  executionStack = [];
  constructor() {
  }
  addBreakpoint(id, line, condition) {
    const bp = {
      id,
      line,
      condition,
      hitCount: 0,
      enabled: true
    };
    this.breakpoints.set(id, bp);
    return bp;
  }
  removeBreakpoint(id) {
    return this.breakpoints.delete(id);
  }
  getBreakpoint(id) {
    return this.breakpoints.get(id);
  }
  getBreakpoints() {
    return Array.from(this.breakpoints.values());
  }
  enable() {
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
  }
  isEnabled() {
    return this.enabled;
  }
  checkBreakpoint(line) {
    if (!this.enabled) return void 0;
    for (const bp of this.breakpoints.values()) {
      if (!bp.enabled) continue;
      if (bp.line === line) {
        bp.hitCount++;
        this.hitCounts.set(bp.id, bp.hitCount);
        this.paused = true;
        this.pauseReason = { type: "breakpoint", breakpoint: bp };
        return bp;
      }
    }
    return void 0;
  }
  watch(name, fn) {
    this.watchExpressions.set(name, fn());
  }
  getWatchValue(name) {
    return this.watchExpressions.get(name);
  }
  getWatchExpressions() {
    return this.watchExpressions;
  }
  pause(reason) {
    this.paused = true;
    this.pauseReason = { type: "pause" };
  }
  continue() {
    this.paused = false;
    this.pauseReason = void 0;
  }
  stepOver() {
    this.stepMode = "over";
    this.paused = false;
  }
  stepOut() {
    this.stepMode = "out";
    this.paused = false;
  }
  stepNext() {
    this.stepMode = "next";
    this.paused = false;
  }
  isPaused() {
    return this.paused;
  }
  getPauseReason() {
    return this.pauseReason;
  }
  setPauseOnExceptions(enabled) {
    this.pauseOnExceptions = enabled;
  }
  shouldPauseOnExceptions() {
    return this.pauseOnExceptions;
  }
  exception(error) {
    if (this.pauseOnExceptions) {
      this.paused = true;
      this.pauseReason = { type: "exception", error };
    }
  }
  pushFrame(name, line, scope) {
    this.executionStack.push({ name, line, scope });
  }
  popFrame() {
    return this.executionStack.pop();
  }
  getFrames() {
    return this.executionStack;
  }
  getCurrentFrame() {
    return this.executionStack[this.executionStack.length - 1];
  }
  clear() {
    this.breakpoints.clear();
    this.watchExpressions.clear();
    this.executionStack = [];
    this.paused = false;
    this.pauseReason = void 0;
  }
  toJSON() {
    return {
      breakpoints: this.getBreakpoints(),
      watches: Array.from(this.watchExpressions.keys()),
      paused: this.paused,
      pauseReason: this.pauseReason,
      frames: this.executionStack
    };
  }
}
export default OmniDebugger;
