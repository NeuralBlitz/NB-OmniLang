export class OmniCloudAPI {
  baseUrl;
  apiKey;
  constructor(baseUrl = "https://api.omnilang.cloud", apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.OMNI_API_KEY || "";
  }
  async compile(request) {
    const response = await fetch(`${this.baseUrl}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(request)
    });
    return response.json();
  }
  async getResult(id) {
    const response = await fetch(`${this.baseUrl}/compile/${id}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });
    return response.json();
  }
  async createInstance(config) {
    const response = await fetch(`${this.baseUrl}/instances`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }
  async listInstances() {
    const response = await fetch(`${this.baseUrl}/instances`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });
    return response.json();
  }
  async deleteInstance(id) {
    await fetch(`${this.baseUrl}/instances/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });
  }
  async executeRemotely(code, options) {
    const request = {
      code,
      language: options?.language,
      timeout: options?.timeout || 3e4
    };
    if (options?.instanceId) {
      const instance = await this.createInstance({
        id: options.instanceId,
        status: "running",
        resources: { cpu: 1, memory: 512, timeout: 3e4 }
      });
    }
    return this.compile(request);
  }
}
export class PackageManager {
  registry;
  cache = /* @__PURE__ */ new Map();
  constructor(registry = "https://registry.npmjs.org") {
    this.registry = registry;
  }
  async search(query) {
    if (this.cache.has(query)) {
      return this.cache.get(query);
    }
    const response = await fetch(
      `${this.registry}/-/v1/search?text=${encodeURIComponent(query)}&size=10`
    );
    const data = await response.json();
    const results = (data.objects || []).map(
      (pkg) => ({
        name: pkg.package.name,
        version: pkg.package.version,
        description: pkg.package.description,
        downloads: pkg.package.downloads || 0,
        maintainers: pkg.package.maintainers || []
      })
    );
    this.cache.set(query, results);
    return results;
  }
  async install(packageName, version) {
    const packageId = version ? `${packageName}@${version}` : packageName;
    console.log(`Installing ${packageId}...`);
    return { path: `./node_modules/${packageName}`, version: version || "latest" };
  }
  clearCache() {
    this.cache.clear();
  }
}
export default OmniCloudAPI;
