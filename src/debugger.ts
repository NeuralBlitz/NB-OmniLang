export interface Breakpoint {
  id: string;
  line: number;
  condition?: string;
  hitCount: number;
  enabled: boolean;
}

export interface DebugFrame {
  name: string;
  line: number;
  scope: Record<string, unknown>;
}

export interface DebuggerPauseReason {
  type: "breakpoint" | "step" | "exception" | "pause";
  breakpoint?: Breakpoint;
  error?: Error;
}

export class OmniDebugger {
  private breakpoints: Map<string, Breakpoint> = new Map();
  private watchExpressions: Map<string, unknown> = new Map();
  private enabled: boolean = false;
  private pauseOnExceptions: boolean = true;
  private stepMode: "over" | "out" | "next" = "over";
  private paused: boolean = false;
  private pauseReason?: DebuggerPauseReason;
  private hitCounts: Map<string, number> = new Map();
  private executionStack: DebugFrame[] = [];

  constructor() {}

  addBreakpoint(id: string, line: number, condition?: string): Breakpoint {
    const bp: Breakpoint = {
      id,
      line,
      condition,
      hitCount: 0,
      enabled: true,
    };
    this.breakpoints.set(id, bp);
    return bp;
  }

  removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  getBreakpoint(id: string): Breakpoint | undefined {
    return this.breakpoints.get(id);
  }

  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  checkBreakpoint(line: number): Breakpoint | undefined {
    if (!this.enabled) return undefined;

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
    return undefined;
  }

  watch(name: string, fn: () => unknown): void {
    this.watchExpressions.set(name, fn());
  }

  getWatchValue(name: string): unknown {
    return this.watchExpressions.get(name);
  }

  getWatchExpressions(): Map<string, unknown> {
    return this.watchExpressions;
  }

  pause(reason?: string): void {
    this.paused = true;
    this.pauseReason = { type: "pause" };
  }

  continue(): void {
    this.paused = false;
    this.pauseReason = undefined;
  }

  stepOver(): void {
    this.stepMode = "over";
    this.paused = false;
  }

  stepOut(): void {
    this.stepMode = "out";
    this.paused = false;
  }

  stepNext(): void {
    this.stepMode = "next";
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getPauseReason(): DebuggerPauseReason | undefined {
    return this.pauseReason;
  }

  setPauseOnExceptions(enabled: boolean): void {
    this.pauseOnExceptions = enabled;
  }

  shouldPauseOnExceptions(): boolean {
    return this.pauseOnExceptions;
  }

  exception(error: Error): void {
    if (this.pauseOnExceptions) {
      this.paused = true;
      this.pauseReason = { type: "exception", error };
    }
  }

  pushFrame(name: string, line: number, scope: Record<string, unknown>): void {
    this.executionStack.push({ name, line, scope });
  }

  popFrame(): DebugFrame | undefined {
    return this.executionStack.pop();
  }

  getFrames(): DebugFrame[] {
    return this.executionStack;
  }

  getCurrentFrame(): DebugFrame | undefined {
    return this.executionStack[this.executionStack.length - 1];
  }

  clear(): void {
    this.breakpoints.clear();
    this.watchExpressions.clear();
    this.executionStack = [];
    this.paused = false;
    this.pauseReason = undefined;
  }

  toJSON() {
    return {
      breakpoints: this.getBreakpoints(),
      watches: Array.from(this.watchExpressions.keys()),
      paused: this.paused,
      pauseReason: this.pauseReason,
      frames: this.executionStack,
    };
  }
}

export default OmniDebugger;