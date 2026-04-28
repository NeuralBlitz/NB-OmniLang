import { spawn } from "child_process";
import { EventEmitter } from "events";
import * as net from "net";
export class OmniLanguageServer extends EventEmitter {
  server = null;
  connections = /* @__PURE__ */ new Set();
  documents = /* @__PURE__ */ new Map();
  capabilities = {
    textDocumentSync: 1,
    definitionProvider: true,
    referencesProvider: true
  };
  initialized = false;
  debugPort = 0;
  constructor() {
    super();
  }
  start(port = 3007) {
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
  handleConnection(socket) {
    this.connections.add(socket);
    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      let newlineIndex;
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
  handleMessage(socket, raw) {
    try {
      const message = JSON.parse(raw);
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
      }
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  }
  handleInitialize(socket, message) {
    this.initialized = true;
    this.send(socket, {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        capabilities: this.capabilities,
        serverInfo: {
          name: "OmniLang LSP",
          version: "1.0.0"
        }
      }
    });
  }
  handleDidOpen(message) {
    const params = message.params;
    this.documents.set(params.textDocument.uri, params.textDocument.text);
  }
  handleDidChange(message) {
    const params = message.params;
    const uri = params.textDocument.uri;
    if (params.contentChanges.length > 0) {
      this.documents.set(uri, params.contentChanges[0].text);
    }
  }
  handleDefinition(socket, message) {
    const params = message.params;
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
          uri,
          range: {
            start: { line: params.position.line, character: 0 },
            end: { line: params.position.line, character: line.length }
          }
        }
      });
    } else {
      this.send(socket, { jsonrpc: "2.0", id: message.id, result: null });
    }
  }
  handleCompletion(socket, message) {
    const completions = [
      { label: "omni:data", insertText: 'omni:data name="$1"\n$0', insertTextFormat: 2 },
      { label: "omni:compute", insertText: "omni:compute\nreturn $0", insertTextFormat: 2 },
      { label: "omni:chart", insertText: 'omni:chart type="bar" data="$1"', insertTextFormat: 2 },
      { label: "omni:panel", insertText: 'omni:panel title="$1"', insertTextFormat: 2 },
      { label: "omni:demo", insertText: "omni:demo$0", insertTextFormat: 2 },
      { label: "omni:hud", insertText: "omni:hud$0", insertTextFormat: 2 }
    ];
    this.send(socket, {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        isIncomplete: false,
        items: completions
      }
    });
  }
  send(socket, message) {
    socket.write(JSON.stringify(message) + "\n");
  }
  broadcast(message) {
    for (const socket of this.connections) {
      this.send(socket, message);
    }
  }
  stop() {
    for (const socket of this.connections) {
      socket.end();
    }
    this.connections.clear();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
  debugPortEnabled(port) {
    this.debugPort = port;
  }
  getPort() {
    return this.debugPort;
  }
}
export class OmniDebugAdapter {
  process = null;
  breakpoints = /* @__PURE__ */ new Map();
  launch(program, port = 9229) {
    return new Promise((resolve, reject) => {
      this.process = spawn("node", ["--inspect=" + port, program], {
        stdio: ["ignore", "pipe", "pipe"]
      });
      this.process.on("error", reject);
      this.process.on("exit", (code) => {
        console.log("Debug process exited:", code);
      });
      setTimeout(resolve, 100);
    });
  }
  setBreakpoint(file, line) {
    const existing = this.breakpoints.get(file) || [];
    existing.push(line);
    this.breakpoints.set(file, existing);
  }
  clearBreakpoint(file, line) {
    const existing = this.breakpoints.get(file) || [];
    this.breakpoints.set(file, existing.filter((l) => l !== line));
  }
  getBreakpoints(file) {
    return this.breakpoints.get(file) || [];
  }
  terminate() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
export default OmniLanguageServer;
