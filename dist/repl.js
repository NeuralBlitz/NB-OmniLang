#!/usr/bin/env node
import * as readline from "readline";
import { Tokenizer, Parser, Compiler } from "./compiler.js";
import { NLPEngine } from "./nlp.js";
import { OmniLang } from "./index.js";
import * as fs from "fs";
import * as path from "path";
const HELP = `
OmniLang REPL - Interactive Programming Environment

Commands:
  .help              Show this help message
  .load <file>       Load and execute a file
  .save <file>       Save current session to file
  .clear             Clear the screen
  .history           Show command history
  .ast <expr>        Show AST for expression
  .tokens <expr>     Show tokens for expression
  .compile <code>    Compile code and show output
  .nlp <prompt>      Process natural language prompt
  .data <name>       Show data in scope
  .quit / .exit      Exit the REPL

Examples:
  data.users = [{name: "Alice", age: 30}]
  sum([1, 2, 3])
  .nlp create a chart of sales data
  .ast 1 + 2 * 3
`;
export class REPL {
    rl;
    context;
    prompt = "omni> ";
    compiler;
    lineNumber = 1;
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
            historySize: 1000,
        });
        this.context = {
            variables: new Map(),
            functions: new Map(),
            history: [],
            nlp: new NLPEngine(),
            omni: new OmniLang(),
        };
        this.compiler = new Compiler();
        this.setupHandlers();
        this.welcome();
    }
    welcome() {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ████████╗██████╗  █████╗ ███╗   ██╗███████╗███╗   ███╗   ║
║   ╚══██╔══╝██╔══██╗██╔══██╗████╗  ██║██╔════╝████╗ ████║   ║
║      ██║   ██████╔╝███████║██╔██╗ ██║███████╗██╔████╔██║   ║
║      ██║   ██╔══██╗██╔══██║██║╚██╗██║╚════██║██║╚██╔╝██║   ║
║      ██║   ██║  ██║██║  ██║██║ ╚████║███████║██║ ╚═╝ ██║   ║
║      ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝   ║
║                                                               ║
║           Executable Markdown + NLP Compiler                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Type .help for commands, .quit to exit
`);
    }
    setupHandlers() {
        this.rl.on("line", (line) => {
            this.handleLine(line.trim());
        });
        this.rl.on("close", () => {
            console.log("\nGoodbye!");
            process.exit(0);
        });
        this.rl.on("history", (history) => {
            this.context.history = history;
        });
    }
    async handleLine(line) {
        this.lineNumber++;
        if (!line) {
            this.prompt = "omni> ";
            return;
        }
        this.context.history.push(line);
        if (line.startsWith(".")) {
            await this.handleCommand(line);
            this.prompt = "omni> ";
            return;
        }
        try {
            const result = await this.evaluate(line);
            if (result !== undefined) {
                console.log(this.formatResult(result));
            }
            this.prompt = "omni> ";
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            this.prompt = "omni... ";
        }
    }
    async handleCommand(line) {
        const parts = line.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(" ");
        switch (cmd) {
            case ".help":
            case ".h":
                console.log(HELP);
                break;
            case ".quit":
            case ".exit":
                this.rl.close();
                break;
            case ".clear":
            case ".cls":
                console.clear();
                break;
            case ".history":
                console.log("Command history:");
                this.context.history.forEach((cmd, i) => {
                    console.log(`  ${i + 1}: ${cmd}`);
                });
                break;
            case ".load":
                await this.loadFile(args);
                break;
            case ".save":
                this.saveHistory(args);
                break;
            case ".ast":
                this.showAst(args);
                break;
            case ".tokens":
                this.showTokens(args);
                break;
            case ".compile":
                this.compileCode(args);
                break;
            case ".nlp":
                await this.processNLP(args);
                break;
            case ".data":
                this.showData(args);
                break;
            case ".vars":
                this.showVariables();
                break;
            default:
                console.log(`Unknown command: ${cmd}. Type .help for available commands.`);
        }
    }
    async loadFile(filePath) {
        if (!filePath) {
            console.log("Usage: .load <filename>");
            return;
        }
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const omni = new OmniLang();
            omni.parse(content);
            await omni.execute();
            console.log(`✓ Loaded and executed: ${filePath}`);
            console.log(`  Data: ${Object.keys(omni.scope.data).join(", ") || "none"}`);
            console.log(`  Computed: ${Object.keys(omni.scope.computed).join(", ") || "none"}`);
        }
        catch (error) {
            console.error(`Error loading file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    saveHistory(filePath) {
        if (!filePath) {
            console.log("Usage: .save <filename>");
            return;
        }
        try {
            fs.writeFileSync(filePath, this.context.history.join("\n"), "utf-8");
            console.log(`✓ Saved ${this.context.history.length} commands to: ${filePath}`);
        }
        catch (error) {
            console.error(`Error saving: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    showAst(code) {
        if (!code) {
            console.log("Usage: .ast <expression>");
            return;
        }
        try {
            const tokenizer = new Tokenizer();
            const tokens = tokenizer.tokenize(code);
            const parser = new Parser();
            const ast = parser.parse(tokens);
            console.log(JSON.stringify(ast, null, 2));
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    showTokens(code) {
        if (!code) {
            console.log("Usage: .tokens <expression>");
            return;
        }
        try {
            const tokenizer = new Tokenizer();
            const tokens = tokenizer.tokenize(code);
            console.log("Tokens:");
            tokens.forEach((tok, i) => {
                console.log(`  ${i + 1}: ${tok.type.padEnd(12)} "${tok.value}"`);
            });
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    compileCode(code) {
        if (!code) {
            console.log("Usage: .compile <code>");
            return;
        }
        try {
            const result = this.compiler.compile(code);
            console.log("Compiled output:");
            console.log(result.code);
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async processNLP(prompt) {
        if (!prompt) {
            console.log("Usage: .nlp <natural language prompt>");
            return;
        }
        console.log(`Processing: "${prompt}"`);
        const result = this.context.nlp.process(prompt);
        console.log("\n--- Intent ---");
        console.log(`Action: ${result.action}`);
        console.log(`Confidence: ${(result.intents[0]?.confidence || 0).toFixed(2)}`);
        console.log("\n--- Entities ---");
        result.entities.forEach((entity) => {
            console.log(`  ${entity.type}: ${entity.value} (${entity.confidence.toFixed(2)})`);
        });
        console.log("\n--- Explanation ---");
        console.log(result.explanation);
        console.log("\n--- Generated Code ---");
        console.log(result.code);
    }
    showData(name) {
        const data = this.context.omni.scope.data;
        if (name) {
            if (data[name]) {
                console.log(`${name}:`, data[name]);
            }
            else {
                console.log(`Data "${name}" not found. Available: ${Object.keys(data).join(", ")}`);
            }
        }
        else {
            console.log("Available data:");
            Object.entries(data).forEach(([key, value]) => {
                console.log(`  ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
            });
        }
    }
    showVariables() {
        console.log("Variables:");
        if (this.context.variables.size === 0) {
            console.log("  (none)");
        }
        else {
            this.context.variables.forEach((value, key) => {
                console.log(`  ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
            });
        }
    }
    async evaluate(code) {
        try {
            const result = this.compiler.compile(code);
            const fn = new Function(`return (${result.code})`);
            const context = {
                Math,
                JSON,
                Array,
                Object,
                String,
                Number,
                Date,
                Set,
                Map,
                console: {
                    log: (...args) => console.log(...args),
                    error: (...args) => console.error(...args),
                    warn: (...args) => console.warn(...args),
                },
                len: (arr) => (arr ? arr.length : 0),
                sum: (arr, key) => {
                    if (!arr)
                        return 0;
                    if (key) {
                        return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
                    }
                    return arr.reduce((sum, val) => sum + Number(val), 0);
                },
                avg: (arr, key) => {
                    if (!arr || arr.length === 0)
                        return 0;
                    const arrAny = arr;
                    const total = arrAny.reduce((sum, item) => sum + (Number(item) || 0), 0);
                    return total / (arrAny.length || 1);
                },
                filter: (arr, fn) => (arr ? arr.filter(fn) : []),
                map: (arr, fn) => (arr ? arr.map(fn) : []),
                groupBy: (arr, key) => {
                    if (!arr)
                        return {};
                    return arr.reduce((groups, item) => {
                        const groupKey = String(item[key]);
                        if (!groups[groupKey])
                            groups[groupKey] = [];
                        groups[groupKey].push(item);
                        return groups;
                    }, {});
                },
                sort: (arr, key, direction = "asc") => {
                    if (!arr)
                        return [];
                    const sorted = [...arr].sort((a, b) => {
                        const aVal = key ? a[key] : a;
                        const bVal = key ? b[key] : b;
                        if (typeof aVal === "number" && typeof bVal === "number") {
                            return aVal - bVal;
                        }
                        return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                    });
                    return direction === "desc" ? sorted.reverse() : sorted;
                },
                unique: (arr) => (arr ? [...new Set(arr)] : []),
                print: (msg) => console.log(msg),
                read: (filePath) => {
                    try {
                        return fs.readFileSync(path.resolve(filePath), "utf-8");
                    }
                    catch {
                        return null;
                    }
                },
                write: (filePath, content) => {
                    try {
                        fs.writeFileSync(path.resolve(filePath), content, "utf-8");
                        return true;
                    }
                    catch {
                        return false;
                    }
                },
                fetch: async (url) => {
                    const response = await fetch(url);
                    return response.json();
                },
                sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
                ...Object.fromEntries(this.context.variables),
                ...Object.fromEntries(this.context.functions),
            };
            const value = fn.call(context);
            if (typeof value === "function") {
                return value;
            }
            if (code.includes("=") && !code.includes("==")) {
                const varName = code.split("=")[0].trim();
                if (varName && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(varName)) {
                    this.context.variables.set(varName, value);
                }
            }
            return value;
        }
        catch (error) {
            throw new Error(`Evaluation error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    formatResult(result) {
        if (result === undefined)
            return "";
        if (result === null)
            return "null";
        if (typeof result === "function")
            return "[Function]";
        if (typeof result === "object") {
            try {
                return JSON.stringify(result, null, 2);
            }
            catch {
                return String(result);
            }
        }
        return String(result);
    }
    start() {
        this.rl.setPrompt(this.prompt);
        this.rl.prompt();
    }
}
const repl = new REPL();
repl.start();
//# sourceMappingURL=repl.js.map