import type { NLPResult } from "./types.js";
export declare class NLPEngine {
    private customIntents;
    private customEntities;
    constructor();
    private registerBuiltInPatterns;
    registerIntent(name: string, pattern: RegExp): void;
    registerEntity(type: string, pattern: RegExp): void;
    process(input: string): NLPResult;
    private extractIntents;
    private extractIntentEntities;
    private extractEntities;
    private calculateConfidence;
    private determineAction;
    private generateCode;
    private generateCreateData;
    private generateRender;
    private generateCompute;
    private generateFilter;
    private generateGroup;
    private generateSort;
    private generateLoad;
    private generateQuery;
    private generateGeneric;
    private explainAction;
    suggestCompletions(input: string): string[];
    extractDataSpecs(input: string): {
        name?: string;
        format?: string;
        fields?: string[];
    };
}
export default NLPEngine;
//# sourceMappingURL=nlp.d.ts.map