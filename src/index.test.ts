import { describe, it, expect, beforeEach } from "vitest";
import { OmniLang } from "./index.js";

describe("OmniLang", () => {
  let omni: OmniLang;

  beforeEach(() => {
    omni = new OmniLang();
  });

  describe("parse", () => {
    it("should parse basic markdown with data fence", () => {
      const markdown = `# Test

\`\`\`omni:data name="users"
[{"name": "Alice", "age": 30}]
\`\`\`
`;

      omni.parse(markdown);

      expect(omni.getFences()).toHaveLength(1);
      expect(omni.getFences()[0].type).toBe("data");
      expect(omni.getFences()[0].attrs.name).toBe("users");
    });

    it("should parse multiple fences", () => {
      const markdown = `# Test

\`\`\`omni:data name="users"
[{"name": "Alice"}]
\`\`\`

\`\`\`omni:compute name="count"
return len(data.users);
\`\`\`
`;

      omni.parse(markdown);

      expect(omni.getFences()).toHaveLength(2);
    });

    it("should parse inline expressions", () => {
      const markdown = `# Test

We have \`\`\`omni:inline len(data.users)\`\`\` users.
`;

      omni.parse(markdown);

      expect(omni.getInlineExpressions()).toHaveLength(1);
      expect(omni.getInlineExpressions()[0].expression).toBe(
        "len(data.users)"
      );
    });

    it("should handle yaml fence", () => {
      const markdown = `# Test

\`\`\`omni:yaml name="config"
title: My App
version: 1.0
\`\`\`
`;

      omni.parse(markdown);

      expect(omni.getFences()).toHaveLength(1);
      expect(omni.getFences()[0].type).toBe("yaml");
    });

    it("should handle csv fence", () => {
      const markdown = `# Test

\`\`\`omni:csv name="sales"
product,revenue
Widget A,1000
Widget B,1500
\`\`\`
`;

      omni.parse(markdown);

      expect(omni.getFences()).toHaveLength(1);
      expect(omni.getFences()[0].type).toBe("csv");
    });

    it("should handle chart fence", () => {
      const markdown = `# Test

\`\`\`omni:chart type="bar" data="sales" x="product" y="revenue"
\`\`\`
`;

      omni.parse(markdown);

      expect(omni.getFences()).toHaveLength(1);
      expect(omni.getFences()[0].type).toBe("chart");
    });

    it("should handle table fence", () => {
      const markdown = `# Test

\`\`\`omni:table data="users"
\`\`\`
`;

      omni.parse(markdown);

      expect(omni.getFences()).toHaveLength(1);
      expect(omni.getFences()[0].type).toBe("table");
    });

    it("should handle query fence", () => {
      const markdown = `# Test

\`\`\`omni:query name="highEarnings" data="users" where="u.age > 25" select="name,age"
\`\`\`
`;

      omni.parse(markdown);

      expect(omni.getFences()).toHaveLength(1);
      expect(omni.getFences()[0].type).toBe("query");
    });
  });

  describe("execute", () => {
    it("should execute data fence and store data", async () => {
      const markdown = `# Test

\`\`\`omni:data name="users"
[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.data.users).toEqual([
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ]);
    });

    it("should execute compute fence with helpers", async () => {
      const markdown = `# Test

\`\`\`omni:data name="sales"
[
  {"product": "A", "amount": 100},
  {"product": "B", "amount": 200}
]
\`\`\`

\`\`\`omni:compute name="total"
return sum(data.sales, 'amount');
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.computed.total).toBe(300);
    });

    it("should execute multiple compute fences in order", async () => {
      const markdown = `# Test

\`\`\`omni:data name="items"
[10, 20, 30]
\`\`\`

\`\`\`omni:compute name="total"
return sum(data.items);
\`\`\`

\`\`\`omni:compute name="average"
return avg(data.items);
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.computed.total).toBe(60);
      expect(omni.scope.computed.average).toBe(20);
    });

    it("should handle groupBy helper", async () => {
      const markdown = `# Test

\`\`\`omni:data name="orders"
[
  {"category": "A", "amount": 100},
  {"category": "B", "amount": 200},
  {"category": "A", "amount": 150}
]
\`\`\`

\`\`\`omni:compute name="grouped"
return groupBy(data.orders, 'category');
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.computed.grouped).toEqual({
        A: [
          { category: "A", amount: 100 },
          { category: "A", amount: 150 },
        ],
        B: [{ category: "B", amount: 200 }],
      });
    });

    it("should execute chart fence", async () => {
      const markdown = `# Test

\`\`\`omni:data name="sales"
[
  {"product": "A", "revenue": 100},
  {"product": "B", "revenue": 200}
]
\`\`\`

\`\`\`omni:chart type="bar" data="sales" x="product" y="revenue"
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.charts).toHaveLength(1);
      expect(omni.scope.charts[0].config.type).toBe("bar");
    });

    it("should execute yaml fence", async () => {
      const markdown = `# Test

\`\`\`omni:yaml name="config"
title: My App
version: 1.0
features:
  - auth
  - api
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.data.config).toEqual({
        title: "My App",
        version: 1.0,
        features: ["auth", "api"],
      });
    });

    it("should execute csv fence", async () => {
      const markdown = `# Test

\`\`\`omni:csv name="sales"
product,revenue
Widget A,1000
Widget B,1500
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.data.sales).toEqual([
        { product: "Widget A", revenue: "1000" },
        { product: "Widget B", revenue: "1500" },
      ]);
    });

    it("should execute table fence", async () => {
      const markdown = `# Test

\`\`\`omni:data name="users"
[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
\`\`\`

\`\`\`omni:table data="users"
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      const fence = omni.getFences().find((f) => f.type === "table");
      expect(fence?.result).toContain("<table");
      expect(fence?.result).toContain("Alice");
    });

    it("should execute query fence", async () => {
      const markdown = `# Test

\`\`\`omni:data name="users"
[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
\`\`\`

\`\`\`omni:compute name="adults"
return filter(data.users, u => u.age >= 30);
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.computed.adults).toHaveLength(1);
    });

    it("should capture errors in non-strict mode", async () => {
      const markdown = `# Test

\`\`\`omni:data name="users"
invalid json
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      const fence = omni.getFences()[0];
      expect(fence.error).toContain("Invalid JSON");
    });

    it("should capture missing data source errors", async () => {
      const markdown = `# Test

\`\`\`omni:chart type="bar" data="nonexistent"
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      const fence = omni.getFences()[0];
      expect(fence.error).toContain("not found");
    });
  });

  describe("render", () => {
    it("should render markdown to HTML", () => {
      const markdown = `# Hello

This is a test.

## Section

Some content.
`;

      omni.parse(markdown);
      const html = omni.render();

      expect(html).toContain("<h1>Hello</h1>");
      expect(html).toContain("<h2>Section</h2>");
      expect(html).toContain("<p>This is a test.</p>");
    });

    it("should render inline expressions", async () => {
      const markdown = `# Test

\`\`\`omni:data name="items"
[10, 20, 30]
\`\`\`

Total: \`\`\`omni:inline sum(data.items)\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();
      const html = omni.render();

      expect(html).toContain("60");
    });

    it("should escape HTML in compute results", async () => {
      const markdown = `# Test

\`\`\`omni:compute name="xss"
return "<script>alert('xss')</script>";
\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();

      expect(omni.scope.computed.xss).toContain("<script>");
    });
  });

  describe("toHtml", () => {
    it("should generate complete HTML document", async () => {
      const markdown = `# Test

\`\`\`omni:data name="items"
[10, 20]
\`\`\`

Total: \`\`\`omni:inline sum(data.items)\`\`\`
`;

      omni.parse(markdown);
      await omni.execute();
      const html = omni.toHtml();

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("<body>");
      expect(html).toContain("30");
    });

    it("should support dark theme", async () => {
      const markdown = `# Test`;

      omni.parse(markdown);
      const html = omni.toHtml({ theme: "dark" });

      expect(html).toContain("background: #1a1a1a");
    });
  });

  describe("validate", () => {
    it("should validate valid document", () => {
      const markdown = `# Test

\`\`\`omni:data name="users"
[{"name": "Alice"}]
\`\`\`

\`\`\`omni:chart type="bar" data="users" x="name"
\`\`\`
`;

      omni.parse(markdown);
      const result = omni.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report missing data name", () => {
      const markdown = `# Test

\`\`\`omni:data
[{"name": "Alice"}]
\`\`\`
`;

      omni.parse(markdown);
      const result = omni.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const nameError = result.errors.find(e => e.includes("name"));
      expect(nameError).toBeDefined();
    });

    it("should report invalid chart type", () => {
      const markdown = `# Test

\`\`\`omni:chart type="invalid"
\`\`\`
`;

      omni.parse(markdown);
      const result = omni.validate();

      expect(result.valid).toBe(false);
      const typeError = result.errors.find(e => e.includes("Unknown chart type"));
      expect(typeError).toBeDefined();
    });
  });
});

describe("OmniLang helpers", () => {
  let omni: OmniLang;

  beforeEach(() => {
    omni = new OmniLang();
  });

  it("should provide len helper", async () => {
    const markdown = `
\`\`\`omni:data name="items"
[1, 2, 3]
\`\`\`

\`\`\`omni:compute name="count"
return len(data.items);
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.count).toBe(3);
  });

  it("should provide sum helper", async () => {
    const markdown = `
\`\`\`omni:data name="sales"
[{"amount": 100}, {"amount": 200}]
\`\`\`

\`\`\`omni:compute name="total"
return sum(data.sales, 'amount');
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.total).toBe(300);
  });

  it("should provide avg helper", async () => {
    const markdown = `
\`\`\`omni:data name="scores"
[100, 200]
\`\`\`

\`\`\`omni:compute name="average"
return avg(data.scores);
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.average).toBe(150);
  });

  it("should provide max/min helpers", async () => {
    const markdown = `
\`\`\`omni:data name="values"
[5, 10, 3, 8]
\`\`\`

\`\`\`omni:compute name="extremes"
return { max: max(data.values), min: min(data.values) };
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.extremes).toEqual({ max: 10, min: 3 });
  });

  it("should provide filter helper", async () => {
    const markdown = `
\`\`\`omni:data name="items"
[1, 2, 3, 4, 5]
\`\`\`

\`\`\`omni:compute name="evens"
return filter(data.items, n => n % 2 === 0);
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.evens).toEqual([2, 4]);
  });

  it("should provide map helper", async () => {
    const markdown = `
\`\`\`omni:data name="items"
[1, 2, 3]
\`\`\`

\`\`\`omni:compute name="doubled"
return map(data.items, n => n * 2);
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.doubled).toEqual([2, 4, 6]);
  });

  it("should provide sort helper", async () => {
    const markdown = `
\`\`\`omni:data name="items"
[3, 1, 2]
\`\`\`

\`\`\`omni:compute name="sorted"
return sort(data.items);
\`\`\`

\`\`\`omni:compute name="sortedDesc"
return sort(data.items, null, 'desc');
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.sorted).toEqual([1, 2, 3]);
    expect(omni.scope.computed.sortedDesc).toEqual([3, 2, 1]);
  });

  it("should provide unique helper", async () => {
    const markdown = `
\`\`\`omni:data name="items"
[1, 2, 2, 3, 3, 3]
\`\`\`

\`\`\`omni:compute name="uniques"
return unique(data.items);
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.uniques).toEqual([1, 2, 3]);
  });

  it("should provide pick and omit helpers", async () => {
    const markdown = `
\`\`\`omni:data name="user"
{"name": "Alice", "age": 30, "email": "alice@example.com"}
\`\`\`

\`\`\`omni:compute name="picked"
return pick(data.user, ['name', 'email']);
\`\`\`

\`\`\`omni:compute name="omitted"
return omit(data.user, ['email']);
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.picked).toEqual({ name: "Alice", email: "alice@example.com" });
    expect(omni.scope.computed.omitted).toEqual({ name: "Alice", age: 30 });
  });

  it("should provide merge helper", async () => {
    const markdown = `
\`\`\`omni:compute name="merged"
return merge({a: 1, b: 2}, {c: 3});
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    expect(omni.scope.computed.merged).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should support plugin registration", () => {
    const omni = new OmniLang({
      plugins: [
        {
          name: "test-plugin",
          version: "1.0.0",
          helpers: {
            double: (n: number) => n * 2,
          },
        },
      ],
    });

    expect(omni.hasPlugin("test-plugin")).toBe(true);
    expect(typeof omni.scope.functions.double).toBe("function");
  });
});

describe("Security features", () => {
  let omni: OmniLang;

  beforeEach(() => {
    omni = new OmniLang();
  });

  it("should include CSP header when enabled", async () => {
    const markdown = `# Test

\`\`\`omni:data name="items"
[1, 2, 3]
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    const html = omni.toHtml({ csp: true });
    expect(html).toContain("Content-Security-Policy");
  });

  it("should not include CSP by default", async () => {
    const markdown = `# Test

\`\`\`omni:data name="items"
[1, 2, 3]
\`\`\`
`;
    omni.parse(markdown);
    await omni.execute();
    const html = omni.toHtml();
    expect(html).not.toContain("Content-Security-Policy");
  });
});
