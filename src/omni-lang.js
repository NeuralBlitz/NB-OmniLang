/**
 * OmniLang - Executable Markdown Runtime
 * Prototype v0.1
 */

class OmniLang {
  constructor() {
    this.scope = {
      data: {},
      computed: {},
      charts: [],
      functions: {}
    };
    this.fences = [];
    this.dependencies = new Map();
  }

  /**
   * Parse OmniLang markdown document
   */
  parse(markdown) {
    this.fences = [];
    const fenceRegex = /```omni:(\w+)(?:\s+(.+?))?\n([\s\S]*?)```/g;
    const inlineRegex = /```omni:inline\s+(.+?)```/g;

    let match;

    // Extract all fences
    while ((match = fenceRegex.exec(markdown)) !== null) {
      const [fullMatch, type, attrs, content] = match;
      
      // Skip inline fences in the main fence list to avoid "Unknown fence type: inline"
      if (type === 'inline') continue;

      const fence = {
        type,
        attrs: this.parseAttributes(attrs || ''),
        content: content.trim(),
        position: match.index,
        fullMatch
      };
      this.fences.push(fence);
    }

    // Extract inline expressions
    this.inlineExpressions = [];
    while ((match = inlineRegex.exec(markdown)) !== null) {
      this.inlineExpressions.push({
        expression: match[1],
        position: match.index,
        fullMatch: match[0]
      });
    }

    this.markdown = markdown;
    return this;
  }

  /**
   * Parse fence attributes (simple key=value parser)
   */
  parseAttributes(attrString) {
    const attrs = {};
    const regex = /(\w+)="([^"]*)"|(\w+)=(\S+)/g;
    let match;

    while ((match = regex.exec(attrString)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] !== undefined ? match[2] : match[4];
      attrs[key] = value;
    }

    return attrs;
  }

  /**
   * Build dependency graph
   */
  analyzeDependencies() {
    this.dependencies.clear();

    for (const fence of this.fences) {
      const deps = new Set();

      // Find references to named data/computed blocks
      const refRegex = /\b(data|computed)\.(\w+)\b/g;
      let match;

      while ((match = refRegex.exec(fence.content)) !== null) {
        deps.add(match[2]);
      }

      // Check attribute references
      if (fence.attrs.data) {
        deps.add(fence.attrs.data);
      }

      this.dependencies.set(fence, deps);
    }
  }

  /**
   * Execute all fences in dependency order
   */
  async execute() {
    this.analyzeDependencies();

    // Topological sort (simple version - execute in order for now)
    for (const fence of this.fences) {
      await this.executeFence(fence);
    }

    return this;
  }

  /**
   * Execute a single fence based on type
   */
  async executeFence(fence) {
    const handler = this[`execute_${fence.type}`];

    if (!handler) {
      console.warn(`Unknown fence type: ${fence.type}`);
      return;
    }

    try {
      fence.result = await handler.call(this, fence);
      fence.executed = true;
    } catch (error) {
      fence.error = error.message;
      console.error(`Error executing ${fence.type} fence:`, error);
    }
  }

  /**
   * Execute data fence - load and store JSON data
   */
  execute_data(fence) {
    const name = fence.attrs.name;
    if (!name) {
      throw new Error('data fence requires a "name" attribute');
    }

    try {
      const data = JSON.parse(fence.content);
      this.scope.data[name] = data;
      return { stored: name, records: Array.isArray(data) ? data.length : 1 };
    } catch (e) {
      throw new Error(`Invalid JSON in data fence: ${e.message}`);
    }
  }

  /**
   * Execute compute fence - run JavaScript computation
   */
  execute_compute(fence) {
    const name = fence.attrs.name;

    // Create safe eval context with access to scope
    const context = {
      data: this.scope.data,
      computed: this.scope.computed,
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Date,
      console,
      Set
    };

    // Helper functions
    context.len = (arr) => arr ? arr.length : 0;
    context.sum = (arr, key) => {
      if (!arr) return 0;
      if (key) return arr.reduce((sum, item) => sum + (item[key] || 0), 0);
      return arr.reduce((sum, val) => sum + val, 0);
    };
    context.avg = (arr, key) => {
      const total = context.sum(arr, key);
      return total / context.len(arr);
    };
    context.max = (arr, key) => {
      if (!arr || arr.length === 0) return null;
      if (key) return Math.max(...arr.map(item => item[key] || 0));
      return Math.max(...arr);
    };
    context.min = (arr, key) => {
      if (!arr || arr.length === 0) return null;
      if (key) return Math.min(...arr.map(item => item[key] || 0));
      return Math.min(...arr);
    };
    context.filter = (arr, fn) => arr ? arr.filter(fn) : [];
    context.map = (arr, fn) => arr ? arr.map(fn) : [];
    context.groupBy = (arr, key) => {
      if (!arr) return {};
      return arr.reduce((groups, item) => {
        const groupKey = item[key];
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(item);
        return groups;
      }, {});
    };

    try {
      // Build function with context
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);

      const fn = new Function(...contextKeys, fence.content);
      const result = fn(...contextValues);

      if (name) {
        this.scope.computed[name] = result;
      }

      return result;
    } catch (e) {
      throw new Error(`Computation error: ${e.message}`);
    }
  }

  /**
   * Execute chart fence - prepare chart configuration
   */
  execute_chart(fence) {
    const config = {
      type: fence.attrs.type || 'bar',
      title: fence.attrs.title || '',
      data: null
    };

    // Get data from reference
    if (fence.attrs.data) {
      const dataSource = this.scope.data[fence.attrs.data] || 
                        this.scope.computed[fence.attrs.data];
      if (!dataSource) {
        throw new Error(`Data source "${fence.attrs.data}" not found`);
      }
      config.data = dataSource;
    } else {
      // Try parsing inline JSON
      try {
        config.data = JSON.parse(fence.content);
      } catch (e) {
        throw new Error(`Chart requires either data attribute or valid JSON content`);
      }
    }

    // Extract x and y if specified
    config.x = fence.attrs.x;
    config.y = fence.attrs.y;

    const chartId = `chart-${this.scope.charts.length}`;
    this.scope.charts.push({ id: chartId, config });

    return { chartId, config };
  }

  /**
   * Evaluate inline expression
   */
  evaluateInline(expression) {
    // Create evaluation context
    const context = {
      data: this.scope.data,
      computed: this.scope.computed,
      len: (arr) => arr ? arr.length : 0,
      sum: (arr, key) => {
        if (!arr) return 0;
        if (key) return arr.reduce((sum, item) => sum + (item[key] || 0), 0);
        return arr.reduce((sum, val) => sum + val, 0);
      }
    };

    try {
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      const fn = new Function(...contextKeys, `return ${expression}`);
      return fn(...contextValues);
    } catch (e) {
      return `[Error: ${e.message}]`;
    }
  }

  /**
   * Render to HTML
   */
  render() {
    let html = this.markdown;

    // Replace fences with rendered output
    for (const fence of this.fences.slice().reverse()) {
      const rendered = this.renderFence(fence);
      html = html.substring(0, fence.position) + 
             rendered + 
             html.substring(fence.position + fence.fullMatch.length);
    }

    // Replace inline expressions
    for (const inline of this.inlineExpressions.slice().reverse()) {
      const value = this.evaluateInline(inline.expression);
      const stringValue = (value === null || value === undefined) ? '' : String(value);
      html = html.substring(0, inline.position) + 
             stringValue + 
             html.substring(inline.position + inline.fullMatch.length);
    }

    // Convert remaining markdown to HTML (simple version)
    html = this.markdownToHTML(html);

    return html;
  }

  /**
   * Render individual fence
   */
  renderFence(fence) {
    if (fence.error) {
      return `<div class="omni-error">Error in ${fence.type} fence: ${fence.error}</div>`;
    }

    switch (fence.type) {
      case 'data':
        return `<div class="omni-data-loaded">✓ Data loaded: ${fence.result.stored} (${fence.result.records} records)</div>`;

      case 'compute':
        if (fence.attrs.name) {
          return `<div class="omni-compute-result">✓ Computed: ${fence.attrs.name}</div>`;
        }
        return `<div class="omni-compute-result">Result: ${JSON.stringify(fence.result)}</div>`;

      case 'chart':
        return `<div class="omni-chart">
          <canvas id="${fence.result.chartId}" width="600" height="400"></canvas>
        </div>`;

      default:
        return '';
    }
  }

  /**
   * Simple markdown to HTML converter
   */
  markdownToHTML(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*<h/g, '<h');
    html = html.replace(/<\/h(\d)>\s*<\/p>/g, '</h$1>');
    html = html.replace(/<p>\s*<div/g, '<div');
    html = html.replace(/<\/div>\s*<\/p>/g, '</div>');

    return html;
  }

  /**
   * Generate complete HTML document
   */
  toHTML() {
    const body = this.render();

    // Generate Chart.js initialization scripts
    const chartScripts = this.scope.charts.map(chart => {
      const { id, config } = chart;
      return this.generateChartScript(id, config);
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniLang Document</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { font-size: 2.5em; margin-bottom: 0.5em; }
    h2 { font-size: 2em; margin-top: 1.5em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.5em; margin-top: 1.2em; }
    .omni-data-loaded {
      background: #e8f5e9;
      padding: 10px 15px;
      border-left: 4px solid #4caf50;
      margin: 15px 0;
      font-size: 0.9em;
    }
    .omni-compute-result {
      background: #e3f2fd;
      padding: 10px 15px;
      border-left: 4px solid #2196f3;
      margin: 15px 0;
      font-size: 0.9em;
    }
    .omni-error {
      background: #ffebee;
      padding: 10px 15px;
      border-left: 4px solid #f44336;
      margin: 15px 0;
      color: #c62828;
    }
    .omni-chart {
      margin: 30px 0;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
    }
    canvas {
      max-width: 100%;
    }
  </style>
</head>
<body>
  ${body}

  <script>
    ${chartScripts}
  </script>
</body>
</html>`;
  }

  /**
   * Generate Chart.js initialization script
   */
  generateChartScript(chartId, config) {
    let chartData;

    if (config.x && config.y && Array.isArray(config.data)) {
      // Structured data with x/y mapping
      chartData = {
        labels: config.data.map(item => item[config.x]),
        datasets: [{
          label: config.y,
          data: config.data.map(item => item[config.y]),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      };
    } else if (Array.isArray(config.data) && config.data[0]?.label) {
      // Pre-formatted chart data
      chartData = {
        labels: config.data.map(item => item.label),
        datasets: [{
          data: config.data.map(item => item.value),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
          ],
          borderWidth: 2
        }]
      };
    } else {
      chartData = { datasets: [] };
    }

    return `
    (function() {
      const ctx = document.getElementById('${chartId}');
      if (!ctx) return;

      new Chart(ctx, {
        type: '${config.type}',
        data: ${JSON.stringify(chartData)},
        options: {
          responsive: true,
          plugins: {
            title: {
              display: ${!!config.title},
              text: '${config.title || ''}'
            },
            legend: {
              display: ${config.type === 'pie' || config.type === 'doughnut'}
            }
          },
          ${config.type === 'bar' || config.type === 'line' ? `
          scales: {
            y: {
              beginAtZero: true
            }
          }` : ''}
        }
      });
    })();
    `;
  }
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OmniLang;
}

// Browser global
if (typeof window !== 'undefined') {
  window.OmniLang = OmniLang;
}