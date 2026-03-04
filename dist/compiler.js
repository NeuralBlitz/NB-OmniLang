export class SimpleTokenizer {
    source = "";
    pos = 0;
    tokens = [];
    tokenize(source) {
        this.source = source;
        this.pos = 0;
        this.tokens = [];
        while (!this.isAtEnd()) {
            this.skipWhitespace();
            if (this.isAtEnd())
                break;
            const ch = this.peek();
            if (ch === "/" && this.peekNext() === "/") {
                this.skipLineComment();
                continue;
            }
            if (this.isDigit(ch)) {
                this.readNumber();
            }
            else if (this.isAlpha(ch) || ch === "_" || ch === "$") {
                this.readIdentifier();
            }
            else if (ch === '"' || ch === "'" || ch === "`") {
                this.readString(ch);
            }
            else {
                this.readOperator();
            }
        }
        this.tokens.push({ type: "EOF", value: "", start: this.pos, end: this.pos });
        return this.tokens;
    }
    isAtEnd() { return this.pos >= this.source.length; }
    peek() { return this.source[this.pos] || ""; }
    peekNext() { return this.source[this.pos + 1] || ""; }
    advance() { return this.source[this.pos++]; }
    isDigit(ch) { return /[0-9]/.test(ch); }
    isAlpha(ch) { return /[a-zA-Z_$]/.test(ch); }
    isAlphaNumeric(ch) { return /[a-zA-Z0-9_$]/.test(ch); }
    skipWhitespace() {
        while (!this.isAtEnd()) {
            const ch = this.peek();
            if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
                this.advance();
            }
            else
                break;
        }
    }
    skipLineComment() {
        while (this.peek() !== "\n" && !this.isAtEnd())
            this.advance();
    }
    readNumber() {
        const start = this.pos;
        while (this.isDigit(this.peek()) || this.peek() === ".")
            this.advance();
        this.addToken("Numeric", this.source.substring(start, this.pos));
    }
    readIdentifier() {
        const start = this.pos;
        while (this.isAlphaNumeric(this.peek()))
            this.advance();
        const value = this.source.substring(start, this.pos);
        const keywords = ["if", "else", "while", "for", "return", "function", "const", "let", "var", "class", "new", "this", "true", "false", "null", "undefined", "async", "await"];
        this.addToken(keywords.includes(value) ? "Keyword" : "Identifier", value);
    }
    readString(quote) {
        this.advance();
        let value = "";
        while (!this.isAtEnd() && this.peek() !== quote) {
            if (this.peek() === "\\") {
                this.advance();
                value += this.advance();
            }
            else
                value += this.advance();
        }
        this.advance();
        this.addToken("String", value);
    }
    readOperator() {
        const operators = ["===", "!==", "==", "!=", "<=", ">=", "=>", "&&", "||", "++", "--", "+=", "-=", "*=", "/="];
        for (const op of operators) {
            if (this.source.substring(this.pos, this.pos + op.length) === op) {
                this.pos += op.length;
                this.addToken("Operator", op);
                return;
            }
        }
        this.addToken("Operator", this.advance());
    }
    addToken(type, value) {
        this.tokens.push({ type, value, start: this.pos - value.length, end: this.pos });
    }
}
export class SimpleParser {
    tokens = [];
    pos = 0;
    parse(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        const body = [];
        while (!this.isAtEnd()) {
            if (this.check("Operator", ";")) {
                this.advance();
                continue;
            }
            const stmt = this.parseStatement();
            if (stmt)
                body.push(stmt);
        }
        return body;
    }
    isAtEnd() { return this.peek().type === "EOF"; }
    peek() { return this.tokens[this.pos] || { type: "EOF", value: "", start: 0, end: 0 }; }
    advance() { return this.tokens[this.pos++]; }
    check(type, value) {
        const tok = this.peek();
        if (value)
            return tok.type === type && tok.value === value;
        return tok.type === type;
    }
    match(type, value) {
        if (this.check(type, value)) {
            this.advance();
            return true;
        }
        return false;
    }
    parseStatement() {
        const tok = this.peek();
        if (tok.value === "if")
            return this.parseIf();
        if (tok.value === "while")
            return this.parseWhile();
        if (tok.value === "for")
            return this.parseFor();
        if (tok.value === "return")
            return this.parseReturn();
        if (tok.value === "function")
            return this.parseFunction();
        if (tok.value === "const" || tok.value === "let" || tok.value === "var")
            return this.parseVarDecl();
        if (tok.value === "class")
            return this.parseClass();
        if (tok.type === "Identifier" || tok.type === "Numeric" || tok.type === "String") {
            return this.parseExprStmt();
        }
        return null;
    }
    parseIf() {
        this.advance();
        this.match("Operator", "(");
        const test = this.parseExpression();
        this.match("Operator", ")");
        const consequent = this.parseBlockOrStmt();
        const alternate = this.match("Keyword", "else") ? this.parseBlockOrStmt() : null;
        return { type: "IfStatement", test, consequent, alternate };
    }
    parseWhile() {
        this.advance();
        this.match("Operator", "(");
        const test = this.parseExpression();
        this.match("Operator", ")");
        const body = this.parseBlockOrStmt();
        return { type: "WhileStatement", test, body };
    }
    parseFor() {
        this.advance();
        this.match("Operator", "(");
        let init = null;
        if (!this.check("Operator", ";")) {
            if (this.match("Keyword", "const") || this.match("Keyword", "let") || this.match("Keyword", "var")) {
                init = this.parseVarDecl();
            }
            else {
                init = this.parseExpression();
            }
        }
        this.match("Operator", ";");
        const test = !this.check("Operator", ";") ? this.parseExpression() : null;
        this.match("Operator", ";");
        const update = !this.check("Operator", ")") ? this.parseExpression() : null;
        this.match("Operator", ")");
        const body = this.parseBlockOrStmt();
        return { type: "ForStatement", init, test, update, body };
    }
    parseReturn() {
        this.advance();
        const argument = !this.check("Operator", ";") ? this.parseExpression() : null;
        return { type: "ReturnStatement", argument };
    }
    parseFunction() {
        this.advance();
        const name = this.match("Identifier") ? this.advance().value : null;
        this.match("Operator", "(");
        const params = this.parseParams();
        this.match("Operator", ")");
        const body = this.parseBlock();
        return { type: "FunctionDeclaration", name, params, body };
    }
    parseVarDecl() {
        const kind = this.advance().value;
        const declarations = [];
        do {
            const name = this.advance().value;
            let init = null;
            if (this.match("Operator", "="))
                init = this.parseExpression();
            declarations.push({ type: "VariableDeclarator", name, init });
        } while (this.match("Operator", ","));
        return { type: "VariableDeclaration", kind, declarations };
    }
    parseClass() {
        this.advance();
        const name = this.advance().value;
        let superClass = null;
        if (this.match("Keyword", "extends"))
            superClass = { type: "Identifier", name: this.advance().value };
        const body = this.parseBlock();
        return { type: "ClassDeclaration", name, superClass, body };
    }
    parseBlockOrStmt() {
        if (this.match("Operator", "{"))
            return this.parseBlock();
        return this.parseStatement() || { type: "EmptyStatement" };
    }
    parseBlock() {
        const body = [];
        while (!this.check("Operator", "}") && !this.isAtEnd()) {
            if (this.match("Operator", ";"))
                continue;
            const stmt = this.parseStatement();
            if (stmt)
                body.push(stmt);
        }
        this.match("Operator", "}");
        return { type: "BlockStatement", body };
    }
    parseParams() {
        const params = [];
        while (!this.check("Operator", ")")) {
            if (params.length > 0)
                this.match("Operator", ",");
            if (this.match("Identifier"))
                params.push(this.advance().value);
        }
        return params;
    }
    parseExprStmt() {
        const expr = this.parseExpression();
        return { type: "ExpressionStatement", expression: expr };
    }
    parseExpression() {
        return this.parseAssignment();
    }
    parseAssignment() {
        let left = this.parseOr();
        while (["=", "+=", "-=", "*=", "/="].includes(this.peek().value)) {
            const operator = this.advance().value;
            const right = this.parseAssignment();
            left = { type: "AssignmentExpression", operator, left, right };
        }
        return left;
    }
    parseOr() {
        let left = this.parseAnd();
        while (this.peek().value === "||") {
            const operator = this.advance().value;
            const right = this.parseAnd();
            left = { type: "LogicalExpression", operator, left, right };
        }
        return left;
    }
    parseAnd() {
        let left = this.parseEquality();
        while (this.peek().value === "&&") {
            const operator = this.advance().value;
            const right = this.parseEquality();
            left = { type: "LogicalExpression", operator, left, right };
        }
        return left;
    }
    parseEquality() {
        let left = this.parseComparison();
        while (["===", "!==", "==", "!="].includes(this.peek().value)) {
            const operator = this.advance().value;
            const right = this.parseComparison();
            left = { type: "BinaryExpression", operator, left, right };
        }
        return left;
    }
    parseComparison() {
        let left = this.parseAdditive();
        while (["<", ">", "<=", ">="].includes(this.peek().value)) {
            const operator = this.advance().value;
            const right = this.parseAdditive();
            left = { type: "BinaryExpression", operator, left, right };
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (["+", "-"].includes(this.peek().value)) {
            const operator = this.advance().value;
            const right = this.parseMultiplicative();
            left = { type: "BinaryExpression", operator, left, right };
        }
        return left;
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (["*", "/", "%"].includes(this.peek().value)) {
            const operator = this.advance().value;
            const right = this.parseUnary();
            left = { type: "BinaryExpression", operator, left, right };
        }
        return left;
    }
    parseUnary() {
        if (["!", "-", "+", "++", "--"].includes(this.peek().value)) {
            const operator = this.advance().value;
            const argument = this.parseUnary();
            return { type: "UnaryExpression", operator, argument, prefix: true };
        }
        return this.parseCall();
    }
    parseCall() {
        let expr = this.parseMember();
        while (true) {
            if (this.match("Operator", "(")) {
                const args = this.parseArgs();
                expr = { type: "CallExpression", callee: expr, arguments: args };
            }
            else if (this.match("Operator", ".")) {
                const property = this.advance().value;
                expr = { type: "MemberExpression", object: expr, property, computed: false };
            }
            else
                break;
        }
        return expr;
    }
    parseMember() {
        if (this.match("Keyword", "new")) {
            const callee = this.parseMember();
            const args = this.match("Operator", "(") ? this.parseArgs() : [];
            return { type: "NewExpression", callee, arguments: args };
        }
        if (this.match("Keyword", "this"))
            return { type: "ThisExpression" };
        return this.parsePrimary();
    }
    parsePrimary() {
        const tok = this.peek();
        if (this.match("Identifier"))
            return { type: "Identifier", name: tok.value };
        if (this.match("Numeric"))
            return { type: "NumericLiteral", value: Number(tok.value) };
        if (this.match("String"))
            return { type: "StringLiteral", value: tok.value };
        if (this.match("Keyword", "true") || this.match("Keyword", "false"))
            return { type: "BooleanLiteral", value: tok.value === "true" };
        if (this.match("Keyword", "null"))
            return { type: "NullLiteral", value: null };
        if (this.match("Operator", "(")) {
            const expr = this.parseExpression();
            this.match("Operator", ")");
            return expr;
        }
        if (this.match("Operator", "[")) {
            const elements = this.parseList();
            return { type: "ArrayExpression", elements };
        }
        if (this.match("Operator", "{")) {
            const props = this.parseObject();
            return { type: "ObjectExpression", properties: props };
        }
        return { type: "Unknown", value: tok.value };
    }
    parseArgs() {
        const args = [];
        while (!this.check("Operator", ")")) {
            if (args.length > 0)
                this.match("Operator", ",");
            args.push(this.parseExpression());
        }
        this.match("Operator", ")");
        return args;
    }
    parseList() {
        const elements = [];
        while (!this.check("Operator", "]")) {
            if (elements.length > 0)
                this.match("Operator", ",");
            elements.push(this.parseExpression());
        }
        this.match("Operator", "]");
        return elements;
    }
    parseObject() {
        const properties = [];
        while (!this.check("Operator", "}")) {
            if (properties.length > 0)
                this.match("Operator", ",");
            const key = this.advance().value;
            this.match("Operator", ":");
            const value = this.parseExpression();
            properties.push({ type: "ObjectProperty", key, value });
        }
        this.match("Operator", "}");
        return properties;
    }
}
export class SimpleCompiler {
    compile(source) {
        const tokenizer = new SimpleTokenizer();
        const tokens = tokenizer.tokenize(source);
        const parser = new SimpleParser();
        const ast = parser.parse(tokens);
        const code = this.emit(ast);
        return { code, ast, tokens };
    }
    emit(ast) {
        return ast.map(node => this.emitNode(node)).join("\n");
    }
    emitNode(node) {
        switch (node.type) {
            case "VariableDeclaration":
                const decls = node.declarations.map((d) => `${d.name}${d.init ? " = " + this.emitNode(d.init) : ""}`).join(", ");
                return `${node.kind} ${decls};`;
            case "FunctionDeclaration":
                const params = node.params.join(", ");
                return `function ${node.name}(${params}) ${this.emitBlock(node.body)}`;
            case "ReturnStatement":
                return node.argument ? `return ${this.emitNode(node.argument)};` : "return;";
            case "IfStatement":
                let s = `if (${this.emitNode(node.test)}) ${this.emitStatement(node.consequent)}`;
                if (node.alternate)
                    s += ` else ${this.emitStatement(node.alternate)}`;
                return s;
            case "WhileStatement":
                return `while (${this.emitNode(node.test)}) ${this.emitStatement(node.body)}`;
            case "ForStatement":
                const init = node.init ? (node.init.declarations ? `${node.init.kind} ${node.init.declarations.map((d) => d.name + (d.init ? " = " + this.emitNode(d.init) : "")).join(", ")}` : this.emitNode(node.init)) : "";
                return `for (${init}; ${node.test ? this.emitNode(node.test) : ""}; ${node.update ? this.emitNode(node.update) : ""}) ${this.emitStatement(node.body)}`;
            case "ExpressionStatement":
                return this.emitNode(node.expression) + ";";
            case "CallExpression":
                const args = node.arguments.map((a) => this.emitNode(a)).join(", ");
                return `${this.emitNode(node.callee)}(${args})`;
            case "MemberExpression":
                if (node.computed)
                    return `${this.emitNode(node.object)}[${this.emitNode(node.property)}]`;
                return `${this.emitNode(node.object)}.${node.property}`;
            case "BinaryExpression":
            case "LogicalExpression":
                return `${this.emitNode(node.left)} ${node.operator} ${this.emitNode(node.right)}`;
            case "UnaryExpression":
                return `${node.operator}${this.emitNode(node.argument)}`;
            case "AssignmentExpression":
                return `${this.emitNode(node.left)} ${node.operator} ${this.emitNode(node.right)}`;
            case "Identifier":
                return node.name || "";
            case "NumericLiteral":
            case "BooleanLiteral":
                return String(node.value);
            case "StringLiteral":
                return `'${node.value}'`;
            case "ArrayExpression":
                return "[" + node.elements.map((e) => this.emitNode(e)).join(", ") + "]";
            case "ObjectExpression":
                return "{ " + node.properties.map((p) => `${p.key}: ${this.emitNode(p.value)}`).join(", ") + " }";
            default:
                return "";
        }
    }
    emitStatement(node) {
        if (node.type === "BlockStatement")
            return this.emitBlock(node.body);
        return this.emitNode(node) + ";";
    }
    emitBlock(body) {
        return "{\n  " + body.map(n => this.emitNode(n)).join("\n  ") + "\n}";
    }
}
export { SimpleTokenizer as Tokenizer, SimpleParser as Parser, SimpleCompiler as Compiler };
//# sourceMappingURL=compiler.js.map