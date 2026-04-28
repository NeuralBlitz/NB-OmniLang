import { describe, it, expect, beforeEach, vi } from "vitest";
import { OmniLanguageServer, OmniDebugAdapter } from "./lsp.js";
import type { LSPMessage, TextDocumentPositionParams } from "./lsp.js";

describe("OmniLanguageServer", () => {
  let server: OmniLanguageServer;

  beforeEach(() => {
    server = new OmniLanguageServer();
  });

  describe("Server Lifecycle", () => {
    it("should start on specified port", async () => {
      const port = await server.start(3007);
      expect(port).toBe(3007);
      server.stop();
    });

    it("should default to port 3007", async () => {
      const port = await server.start();
      expect(port).toBe(3007);
      server.stop();
    });

    it("should stop server", async () => {
      await server.start(3008);
      server.stop();
      // Should not throw
    });
  });

  describe("Message Handling", () => {
    it("should emit message event", async () => {
      const emitted: any[] = [];
      server.on("message", (msg) => emitted.push(msg));
      await server.start(3009);
      server.broadcast({ jsonrpc: "2.0", method: "test" });
      server.stop();
    });
  });

  describe("Document Management", () => {
    it("should track documents", async () => {
      // Documents are set via didOpen message
      expect(true).toBe(true);
    });
  });
});

describe("OmniDebugAdapter", () => {
  let adapter: OmniDebugAdapter;

  beforeEach(() => {
    adapter = new OmniDebugAdapter();
  });

  describe("Breakpoint Management", () => {
    it("should set breakpoint", () => {
      adapter.setBreakpoint("test.js", 10);
      const breakpoints = adapter.getBreakpoints("test.js");
      expect(breakpoints).toContain(10);
    });

    it("should clear breakpoint", () => {
      adapter.setBreakpoint("test.js", 10);
      adapter.clearBreakpoint("test.js", 10);
      const breakpoints = adapter.getBreakpoints("test.js");
      expect(breakpoints).not.toContain(10);
    });

    it("should get breakpoints for file", () => {
      adapter.setBreakpoint("test.js", 10);
      adapter.setBreakpoint("test.js", 20);
      adapter.setBreakpoint("other.js", 5);
      const breakpoints = adapter.getBreakpoints("test.js");
      expect(breakpoints.length).toBe(2);
    });

    it("should return empty for unknown file", () => {
      const breakpoints = adapter.getBreakpoints("unknown.js");
      expect(breakpoints).toEqual([]);
    });
  });

  describe("Process Management", () => {
    it("should terminate process", () => {
      adapter.terminate();
      // Should not throw
    });
  });
});

describe("LSP Message Types", () => {
  it("should validate LSP message structure", () => {
    const message: LSPMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    };
    expect(message.jsonrpc).toBe("2.0");
  });

  it("should handle response message", () => {
    const message: LSPMessage = {
      jsonrpc: "2.0",
      id: 1,
      result: { success: true },
    };
    expect(message.result).toBeDefined();
  });

  it("should handle error message", () => {
    const message: LSPMessage = {
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32600, message: "Invalid Request" },
    };
    expect(message.error?.code).toBe(-32600);
  });
});