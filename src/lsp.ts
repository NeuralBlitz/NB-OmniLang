import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import * as net from "net";
import * as fs from "fs";

export interface LSPMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

export interface TextDocumentPositionParams {
  textDocument: { uri: string };
  position: { line: number; character: number };
}

export interface InitializeParams {
  processId: number;
  rootUri: string;
  capabilities: ClientCapabilities;
}

export interface ClientCapabilities {
  textDocumentSync?: number;
  completionProvider?: boolean;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
}

export interface ServerCapabilities {
  textDocumentSync: number;
  completionProvider?: { resolveProvider?: boolean };
  definitionProvider?: boolean;
  referencesProvider?: boolean;
}

export class OmniLanguageServer extends EventEmitter {
  private server: net.Server | null = null;
  private connections: Set<net.Socket> = new Set();
  private documents: Map<string, string> = new Map();
  private capabilities: ServerCapabilities = {
    textDocumentSync: 1,
    definitionProvider: true,
    referencesProvider: true,
  };
  private initialized = false;
  private debugPort = 0;

  constructor() {
    super();
  }

  start(port: number = 3007): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on("error", (err) => reject(err));
      this.server.listen(port, () => {
        console.log(`Omni LSP Server running on port ${port}`);
        resolve(port);
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    this.connections.add(socket);
    let buffer = "";

    socket.on("data", (data) => {
      buffer += data.toString();
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const message = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (message.trim()) {
          this.handleMessage(socket, message);
        }
      }
    });

    socket.on("close", () => {
      this.connections.delete(socket);
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
      this.connections.delete(socket);
    });
  }

  private handleMessage(socket: net.Socket, raw: string): void {
    try {
      const message: LSPMessage = JSON.parse(raw);
      this.emit("message", message);

      if (message.method === "initialize") {
        this.handleInitialize(socket, message);
      } else if (message.method === "textDocument/didOpen") {
        this.handleDidOpen(message);
      } else if (message.method === "textDocument/didChange") {
        this.handleDidChange(message);
      } else if (message.method === "textDocument/definition") {
        this.handleDefinition(socket, message);
      } else if (message.method === "textDocument/completion") {
        this.handleCompletion(socket, message);
      } else if (message.method === "shutdown") {
        this.send(socket, { jsonrpc: "2.0", id: message.id, result: null });
      } else if (message.method === "$/cancelRequest") {
        // Handle cancellation
      }
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  }

  private handleInitialize(socket: net.Socket, message: LSPMessage): void {
    this.initialized = true;
    this.send(socket, {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        capabilities: this.capabilities,
        serverInfo: {
          name: "OmniLang LSP",
          version: "1.0.0",
        },
      },
    });
  }

  private handleDidOpen(message: LSPMessage): void {
    const params = message.params as { textDocument: { uri: string; text: string } };
    this.documents.set(params.textDocument.uri, params.textDocument.text);
  }

  private handleDidChange(message: LSPMessage): void {
    const params = message.params as {
      contentChanges: Array<{ text: string }>;
      textDocument: { uri: string };
    };
    const uri = params.textDocument.uri;
    if (params.contentChanges.length > 0) {
      this.documents.set(uri, params.contentChanges[0].text);
    }
  }

  private handleDefinition(socket: net.Socket, message: LSPMessage): void {
    const params = message.params as TextDocumentPositionParams;
    const uri = params.textDocument.uri;
    const doc = this.documents.get(uri) || "";
    const lines = doc.split("\n");
    const line = lines[params.position.line] || "";

    const fenceMatch = line.match(/```omni:(\w+)/);
    if (fenceMatch) {
      this.send(socket, {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          uri: uri,
          range: {
            start: { line: params.position.line, character: 0 },
            end: { line: params.position.line, character: line.length },
          },
        },
      });
    } else {
      this.send(socket, { jsonrpc: "2.0", id: message.id, result: null });
    }
  }

  private handleCompletion(socket: net.Socket, message: LSPMessage): void {
    const completions = [
      { label: "omni:data", insertText: 'omni:data name="$1"\n$0', insertTextFormat: 2 },
      { label: "omni:compute", insertText: "omni:compute\nreturn $0", insertTextFormat: 2 },
      { label: "omni:chart", insertText: 'omni:chart type="bar" data="$1"', insertTextFormat: 2 },
      { label: "omni:panel", insertText: 'omni:panel title="$1"', insertTextFormat: 2 },
      { label: "omni:demo", insertText: "omni:demo$0", insertTextFormat: 2 },
      { label: "omni:hud", insertText: "omni:hud$0", insertTextFormat: 2 },
    ];

    this.send(socket, {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        isIncomplete: false,
        items: completions,
      },
    });
  }

  private send(socket: net.Socket, message: LSPMessage): void {
    socket.write(JSON.stringify(message) + "\n");
  }

  broadcast(message: LSPMessage): void {
    for (const socket of this.connections) {
      this.send(socket, message);
    }
  }

  stop(): void {
    for (const socket of this.connections) {
      socket.end();
    }
    this.connections.clear();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  debugPortEnabled(port: number): void {
    this.debugPort = port;
  }

  getPort(): number {
    return this.debugPort;
  }
}

export class OmniDebugAdapter {
  private process: ChildProcess | null = null;
  private breakpoints: Map<string, number[]> = new Map();

  launch(program: string, port: number = 9229): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn("node", ["--inspect=" + port, program], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.process.on("error", reject);
      this.process.on("exit", (code) => {
        console.log("Debug process exited:", code);
      });

      setTimeout(resolve, 100);
    });
  }

  setBreakpoint(file: string, line: number): void {
    const existing = this.breakpoints.get(file) || [];
    existing.push(line);
    this.breakpoints.set(file, existing);
  }

  clearBreakpoint(file: string, line: number): void {
    const existing = this.breakpoints.get(file) || [];
    this.breakpoints.set(file, existing.filter((l) => l !== line));
  }

  getBreakpoints(file: string): number[] {
    return this.breakpoints.get(file) || [];
  }

  terminate(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

export default OmniLanguageServer;