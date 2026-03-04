export interface Token {
    type: string;
    value: string;
    start: number;
    end: number;
}
export declare class SimpleTokenizer {
    private source;
    private pos;
    private tokens;
    tokenize(source: string): Token[];
    private isAtEnd;
    private peek;
    private peekNext;
    private advance;
    private isDigit;
    private isAlpha;
    private isAlphaNumeric;
    private skipWhitespace;
    private skipLineComment;
    private readNumber;
    private readIdentifier;
    private readString;
    private readOperator;
    private addToken;
}
export interface ASTNode {
    type: string;
    [key: string]: any;
}
export declare class SimpleParser {
    private tokens;
    private pos;
    parse(tokens: Token[]): ASTNode[];
    private isAtEnd;
    private peek;
    private advance;
    private check;
    private match;
    private parseStatement;
    private parseIf;
    private parseWhile;
    private parseFor;
    private parseReturn;
    private parseFunction;
    private parseVarDecl;
    private parseClass;
    private parseBlockOrStmt;
    private parseBlock;
    private parseParams;
    private parseExprStmt;
    private parseExpression;
    private parseAssignment;
    private parseOr;
    private parseAnd;
    private parseEquality;
    private parseComparison;
    private parseAdditive;
    private parseMultiplicative;
    private parseUnary;
    private parseCall;
    private parseMember;
    private parsePrimary;
    private parseArgs;
    private parseList;
    private parseObject;
}
export declare class SimpleCompiler {
    compile(source: string): {
        code: string;
        ast: any[];
        tokens: Token[];
    };
    private emit;
    private emitNode;
    private emitStatement;
    private emitBlock;
}
export { SimpleTokenizer as Tokenizer, SimpleParser as Parser, SimpleCompiler as Compiler };
//# sourceMappingURL=compiler.d.ts.map