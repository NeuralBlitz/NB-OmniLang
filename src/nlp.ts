import type { NLPResult, NLPIntent, NLPEntity } from "./types.js";

const MULTI_STEP_PATTERNS = [
  { pattern: /\b(first|then|next|after\s+that|afterwards)\b/i, separator: "then" },
  { pattern: /\b(and\s+also|plus|additionally)\b/i, separator: "and" },
  { pattern: /\b(but\s+also|however|also)\b/i, separator: "but" },
  { pattern: /\b(\d+\.\s+|\ba\.\s+|\bstep\s+\d+)\b/i, separator: "ordered" },
];

const INTENT_PATTERNS: Array<{ pattern: RegExp; name: string; priority: number }> = [
  { pattern: /^(create|make|generate|add)\s+(a\s+)?(data|chart|table|query)/i, name: "create_data", priority: 10 },
  { pattern: /^(show|display|render)\s+(me\s+)?(the\s+)?(data|chart|table|graph)/i, name: "display", priority: 9 },
  { pattern: /^(calculate|compute|sum|average|count|total)\s+(the\s+)?/i, name: "calculate", priority: 8 },
  { pattern: /^(filter|search|find|where)\s+(for\s+)?/i, name: "filter", priority: 8 },
  { pattern: /^(group|organize|break\s+down)\s+(by\s+)?/i, name: "group", priority: 7 },
  { pattern: /^(sort|order|arrange)\s+(by\s+)?/i, name: "sort", priority: 7 },
  { pattern: /^(compare|vs|versus)\s+/i, name: "compare", priority: 7 },
  { pattern: /^(what\s+is|what\s+are|tell\s+me|show\s+me)\s+/i, name: "query", priority: 6 },
  { pattern: /^(how\s+many|how\s+much|what\s+the\s+total)/i, name: "aggregate", priority: 6 },
  { pattern: /^(list|show\s+all|get\s+all)/i, name: "list", priority: 5 },
  { pattern: /^(update|change|modify|edit)\s+/i, name: "update", priority: 5 },
  { pattern: /^(delete|remove|drop)\s+/i, name: "delete", priority: 4 },
  { pattern: /^(load|import|read)\s+(data|file)/i, name: "load_data", priority: 9 },
  { pattern: /^(export|save|write)\s+(to\s+)?/i, name: "export", priority: 4 },
  { pattern: /^(help|what\s+can\s+you\s+do)/i, name: "help", priority: 1 },
];

const ENTITY_PATTERNS: Array<{ pattern: RegExp; type: string; priority: number }> = [
  { pattern: /\b(json|yaml|csv|xml|toml)\b/i, type: "format", priority: 10 },
  { pattern: /\b(bar|line|pie|scatter|doughnut|radar|radar)\s+(chart|graph)?\b/i, type: "chart_type", priority: 10 },
  { pattern: /\b(sum|average|avg|mean|count|min|max|median|mode|std|standard\s+deviation)\b/i, type: "operation", priority: 9 },
  { pattern: /\btoday|yesterday|tomorrow|last\s+week|last\s+month|last\s+year|this\s+week|this\s+month|this\s+year\b/i, type: "time_period", priority: 8 },
  { pattern: /\b(\$|dollar|usd|eur|gbp)\b/i, type: "currency", priority: 7 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*%/i, type: "percentage", priority: 6 },
  { pattern: /\b\d+(?:\.\d+)?\b/i, type: "number", priority: 5 },
  { pattern: /"(.*?)"/g, type: "quoted_string", priority: 5 },
  { pattern: /\b(and|or|but|however|also|plus)\b/i, type: "conjunction", priority: 3 },
  { pattern: /\b(greater\s+than|less\s+than|equal\s+to|above|below|over|under|more\s+than|less\s+than)\b/i, type: "comparison", priority: 7 },
];

export class NLPEngine {
  private customIntents: Map<string, RegExp> = new Map();
  private customEntities: Map<string, RegExp> = new Map();
  private dslPatterns: Map<string, RegExp> = new Map();
  private contextHistory: NLPResult[] = [];
  private userCorrections: Map<string, string> = new Map();

  constructor() {
    this.registerBuiltInPatterns();
    this.registerDSLPatterns();
  }

  private registerBuiltInPatterns(): void {}

  registerIntent(name: string, pattern: RegExp): void {
    this.customIntents.set(name, pattern);
  }

  registerEntity(type: string, pattern: RegExp): void {
    this.customEntities.set(type, pattern);
  }

  registerDSL(name: string, pattern: RegExp): void {
    this.dslPatterns.set(name, pattern);
  }

  registerDSLPatterns(): void {
    this.dslPatterns.set("chart", /\b(bar|line|pie|scatter|doughnut|radar)\b/i);
    this.dslPatterns.set("format", /\b(json|yaml|csv|xml|toml)\b/i);
    this.dslPatterns.set("operation", /\b(sum|average|count|min|max|filter|sort)\b/i);
    this.dslPatterns.set("fence", /\b(omni:\w+)\b/i);
  }

  process(input: string): NLPResult {
    const isMultiStep = this.detectMultiStep(input);
    
    if (isMultiStep.steps.length > 1) {
      return this.processMultiStep(input, isMultiStep);
    }

    const intents = this.extractIntents(input);
    const entities = this.extractEntities(input);

    const result: NLPResult = {
      intents,
      entities,
      action: this.determineAction(intents),
    };

    result.code = this.generateCode(result, input);
    result.explanation = this.explainAction(result, input);

    return result;
  }

  private extractIntents(input: string): NLPIntent[] {
    const intents: NLPIntent[] = [];

    for (const { pattern, name, priority } of INTENT_PATTERNS) {
      const match = pattern.exec(input);
      if (match) {
        const confidence = this.calculateConfidence(match, input.length);
        intents.push({
          name,
          confidence: confidence * (priority / 10),
          entities: this.extractIntentEntities(match, input),
          raw: match[0],
        });
      }
    }

    for (const [name, pattern] of this.customIntents) {
      const match = pattern.exec(input);
      if (match) {
        intents.push({
          name,
          confidence: 0.9,
          entities: {},
          raw: match[0],
        });
      }
    }

    return intents.sort((a, b) => b.confidence - a.confidence);
  }

  private extractIntentEntities(match: RegExpMatchArray, input: string): Record<string, string> {
    const entities: Record<string, string> = {};

    const numberMatch = input.match(/\d+/);
    if (numberMatch) entities.number = numberMatch[0];

    const quotedMatch = input.match(/"([^"]+)"/);
    if (quotedMatch) entities.string = quotedMatch[1];

    return entities;
  }

  private extractEntities(input: string): NLPEntity[] {
    const entities: NLPEntity[] = [];

    for (const { pattern, type, priority } of ENTITY_PATTERNS) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(input)) !== null) {
        entities.push({
          type,
          value: match[1] || match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: priority / 10,
        });
      }
    }

    for (const [type, pattern] of this.customEntities) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(input)) !== null) {
        entities.push({
          type,
          value: match[1] || match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.9,
        });
      }
    }

    return entities.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateConfidence(match: RegExpMatchArray, inputLength: number): number {
    const matchLength = match[0].length;
    const ratio = matchLength / inputLength;
    return Math.min(0.5 + ratio * 0.5, 1.0);
  }

  private determineAction(intents: NLPIntent[]): string {
    if (intents.length === 0) return "unknown";

    const primary = intents[0].name;

    const actionMap: Record<string, string> = {
      create_data: "CREATE_DATA",
      display: "RENDER",
      calculate: "COMPUTE",
      filter: "FILTER",
      group: "GROUP",
      sort: "SORT",
      compare: "COMPARE",
      query: "QUERY",
      aggregate: "AGGREGATE",
      list: "LIST",
      update: "UPDATE",
      delete: "DELETE",
      load_data: "LOAD",
      export: "EXPORT",
      help: "HELP",
    };

    return actionMap[primary] || "UNKNOWN";
  }

  private generateCode(result: NLPResult, input: string): string {
    const intent = result.intents[0];
    if (!intent) return "";

    const entities = result.entities;
    const entityMap = new Map(entities.map((e) => [e.type, e.value]));

    switch (result.action) {
      case "CREATE_DATA":
        return this.generateCreateData(entityMap, input);

      case "RENDER":
        return this.generateRender(entityMap, input);

      case "COMPUTE":
        return this.generateCompute(entityMap, input);

      case "FILTER":
        return this.generateFilter(entityMap, input);

      case "GROUP":
        return this.generateGroup(entityMap, input);

      case "SORT":
        return this.generateSort(entityMap, input);

      case "LOAD":
        return this.generateLoad(entityMap, input);

      case "QUERY":
        return this.generateQuery(entityMap, input);

      default:
        return this.generateGeneric(intent, entityMap, input);
    }
  }

  private generateCreateData(entityMap: Map<string, string>, input: string): string {
    const format = entityMap.get("format") || "json";
    const quotedString = entityMap.get("quoted_string") || "";

    if (format === "json") {
      return `\`\`\`omni:data name="newData"
${quotedString || "[{\"placeholder\": \"value\"}]"}
\`\`\``;
    }

    if (format === "csv") {
      return `\`\`\`omni:csv name="newData"
${quotedString || "column1,column2\nvalue1,value2"}
\`\`\``;
    }

    return `\`\`\`omni:data name="newData"
${quotedString || "{}"}
\`\`\``;
  }

  private generateRender(entityMap: Map<string, string>, input: string): string {
    const chartType = entityMap.get("chart_type") || "bar";
    const dataName = "existingData";

    return `\`\`\`omni:chart type="${chartType}" data="${dataName}" x="label" y="value"
\`\`\``;
  }

  private generateCompute(entityMap: Map<string, string>, input: string): string {
    const operation = entityMap.get("operation") || "sum";

    const operationMap: Record<string, string> = {
      sum: "sum(data.items, 'value')",
      average: "avg(data.items, 'value')",
      avg: "avg(data.items, 'value')",
      count: "len(data.items)",
      min: "min(data.items, 'value')",
      max: "max(data.items, 'value')",
    };

    const expr = operationMap[operation.toLowerCase()] || "sum(data.items)";

    return `\`\`\`omni:compute name="result"
return ${expr};
\`\`\``;
  }

  private generateFilter(entityMap: Map<string, string>, input: string): string {
    return `\`\`\`omni:compute name="filtered"
return filter(data.items, item => item.value > 0);
\`\`\``;
  }

  private generateGroup(entityMap: Map<string, string>, input: string): string {
    return `\`\`\`omni:compute name="grouped"
return groupBy(data.items, 'category');
\`\`\``;
  }

  private generateSort(entityMap: Map<string, string>, input: string): string {
    const direction = input.toLowerCase().includes("desc") ? "desc" : "asc";

    return `\`\`\`omni:compute name="sorted"
return sort(data.items, 'value', '${direction}');
\`\`\``;
  }

  private generateLoad(entityMap: Map<string, string>, input: string): string {
    const format = entityMap.get("format") || "json";
    const quotedString = entityMap.get("quoted_string") || "data.json";

    if (format === "json") {
      return `\`\`\`omni:data name="loadedData"
${quotedString}
\`\`\``;
    }

    if (format === "csv") {
      return `\`\`\`omni:csv name="loadedData"
${quotedString}
\`\`\``;
    }

    return `\`\`\`omni:fetch name="loadedData" url="${quotedString}"
\`\`\``;
  }

  private generateQuery(entityMap: Map<string, string>, input: string): string {
    return `\`\`\`omni:query name="queryResult" data="items"
\`\`\``;
  }

  private generateGeneric(
    intent: NLPIntent,
    entityMap: Map<string, string>,
    input: string
  ): string {
    return `\`\`\`omni:compute name="result"
// Generated from: "${input}"
return data.items;
\`\`\``;
  }

  private explainAction(result: NLPResult, input: string): string {
    const intent = result.intents[0];
    if (!intent) {
      return "I couldn't understand your request. Try being more specific.";
    }

    const explanations: Record<string, string> = {
      CREATE_DATA: "I'll create a new data block with the specified format.",
      RENDER: "I'll generate a visualization using the data and chart type you specified.",
      COMPUTE: "I'll perform the calculation you requested on the data.",
      FILTER: "I'll filter the data based on your criteria.",
      GROUP: "I'll group the data by the specified field.",
      SORT: "I'll sort the data in the requested order.",
      LOAD: "I'll load the data from the specified source.",
      QUERY: "I'll query the data to find what you're looking for.",
      COMPARE: "I'll create a comparison visualization of the data.",
      LIST: "I'll list all the items in the data.",
      AGGREGATE: "I'll calculate the aggregate value you requested.",
    };

    return explanations[result.action] || `I understood your intent as "${intent.name}".`;
  }

  suggestCompletions(input: string): string[] {
    const suggestions: string[] = [];

    const prefixes = [
      "Create a data block: ",
      "Show me a chart of ",
      "Calculate the sum of ",
      "Filter items where ",
      "Group by ",
      "Sort by ",
      "Load data from ",
    ];

    if (input.length < 3) {
      return prefixes;
    }

    const lower = input.toLowerCase();

    if (lower.includes("data") || lower.includes("chart")) {
      suggestions.push("Show me a bar chart of the data", "Create a new data block");
    }

    if (lower.includes("sum") || lower.includes("total") || lower.includes("average")) {
      suggestions.push("Calculate the total", "Calculate the average", "Show me the sum");
    }

    if (lower.includes("filter") || lower.includes("find")) {
      suggestions.push("Filter items where value > 100", "Find all items matching");
    }

    return suggestions.length > 0 ? suggestions : prefixes.slice(0, 3);
  }

  extractDataSpecs(input: string): { name?: string; format?: string; fields?: string[] } {
    const specs: { name?: string; format?: string; fields?: string[] } = {};

    const nameMatch = input.match(/(?:called|named|as)\s+(\w+)/i);
    if (nameMatch) specs.name = nameMatch[1];

    const formatMatch = input.match(/\b(json|yaml|csv|xml)\b/i);
    if (formatMatch) specs.format = formatMatch[1].toLowerCase();

    const fieldsMatch = input.match(/with\s+(?:fields?:|columns?:)\s*\[([^\]]+)\]/i);
    if (fieldsMatch) {
      specs.fields = fieldsMatch[1].split(",").map((f) => f.trim());
    }

    return specs;
  }

  private detectMultiStep(input: string): { steps: string[]; separator: string } {
    const separators = [
      { pattern: /\s+then\s+/i, separator: "then" },
      { pattern: /\s+and\s+then\s+/i, separator: "then" },
      { pattern: /\s+after\s+that\s+/i, separator: "then" },
      { pattern: /(?:^|\n)\s*\d+\.\s+/gm, separator: "ordered" },
    ];

    for (const { pattern, separator } of separators) {
      if (pattern.test(input)) {
        const parts = input.split(pattern).filter(s => s.trim());
        return { steps: parts, separator };
      }
    }

    return { steps: [input], separator: "none" };
  }

  private processMultiStep(input: string, multiStep: { steps: string[]; separator: string }): NLPResult {
    const stepResults = multiStep.steps.map(step => this.process(step.trim()));
    
    const intents: NLPIntent[] = [{
      name: "multi_step",
      confidence: 1.0,
      entities: {},
      raw: input,
    }];

    const codeFences = stepResults
      .map((r, i) => r.code ? `\n\`\`\`omni:compute name="step${i}"\n${r.code}\n\`\`\`` : "")
      .join("\n");

    const result: NLPResult = {
      intents,
      entities: [],
      action: "MULTI_STEP",
      code: codeFences,
      explanation: `This involves ${multiStep.steps.length} steps: ${multiStep.steps.map((s, i) => `${i + 1}. ${s.trim().substring(0, 20)}...`).join(", ")}`,
    };

    return result;
  }

  getContextHistory(): NLPResult[] {
    return this.contextHistory;
  }

  addToContext(result: NLPResult): void {
    this.contextHistory.push(result);
    if (this.contextHistory.length > 10) {
      this.contextHistory.shift();
    }
  }

  learnCorrection(original: string, corrected: string): void {
    this.userCorrections.set(original.toLowerCase(), corrected);
  }

  getLearnedCorrections(): Map<string, string> {
    return this.userCorrections;
  }

applyCorrections(input: string): string {
    let corrected = input;
    for (const [original, replacement] of this.userCorrections) {
      corrected = corrected.split(original).join(replacement);
    }
    return corrected;
  }
}

export default NLPEngine;
