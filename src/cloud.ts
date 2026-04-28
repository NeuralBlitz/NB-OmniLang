export interface CloudCompileRequest {
  code: string;
  language?: string;
  timeout?: number;
  dependencies?: Record<string, string>;
  environment?: Record<string, string>;
}

export interface CloudCompileResponse {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  logs?: string[];
  executionTime?: number;
  createdAt: string;
  completedAt?: string;
}

export interface CloudInstance {
  id: string;
  name: string;
  status: "starting" | "running" | "stopped";
  resources: {
    cpu: number;
    memory: number;
    timeout: number;
  };
}

export class OmniCloudAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = "https://api.omnilang.cloud", apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.OMNI_API_KEY || "";
  }

  async compile(request: CloudCompileRequest): Promise<CloudCompileResponse> {
    const response = await fetch(`${this.baseUrl}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    return response.json();
  }

  async getResult(id: string): Promise<CloudCompileResponse> {
    const response = await fetch(`${this.baseUrl}/compile/${id}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    return response.json();
  }

  async createInstance(config: Partial<CloudInstance>): Promise<CloudInstance> {
    const response = await fetch(`${this.baseUrl}/instances`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(config),
    });

    return response.json();
  }

  async listInstances(): Promise<CloudInstance[]> {
    const response = await fetch(`${this.baseUrl}/instances`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    return response.json();
  }

  async deleteInstance(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/instances/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  async executeRemotely(
    code: string,
    options?: {
      language?: string;
      timeout?: number;
      instanceId?: string;
    }
  ): Promise<CloudCompileResponse> {
    const request: CloudCompileRequest = {
      code,
      language: options?.language,
      timeout: options?.timeout || 30000,
    };

    if (options?.instanceId) {
      const instance = await this.createInstance({
        id: options.instanceId,
        status: "running",
        resources: { cpu: 1, memory: 512, timeout: 30000 },
      });
    }

    return this.compile(request);
  }
}

export interface PackageSearchResult {
  name: string;
  version: string;
  description: string;
  downloads: number;
  maintainers: string[];
}

export class PackageManager {
  private registry: string;
  private cache: Map<string, PackageSearchResult[]> = new Map();

  constructor(registry: string = "https://registry.npmjs.org") {
    this.registry = registry;
  }

  async search(query: string): Promise<PackageSearchResult[]> {
    if (this.cache.has(query)) {
      return this.cache.get(query)!;
    }

    const response = await fetch(
      `${this.registry}/-/v1/search?text=${encodeURIComponent(query)}&size=10`
    );
    const data = await response.json();

    const results: PackageSearchResult[] = (data.objects || []).map(
      (pkg: any) => ({
        name: pkg.package.name,
        version: pkg.package.version,
        description: pkg.package.description,
        downloads: pkg.package.downloads || 0,
        maintainers: pkg.package.maintainers || [],
      })
    );

    this.cache.set(query, results);
    return results;
  }

  async install(
    packageName: string,
    version?: string
  ): Promise<{ path: string; version: string }> {
    const packageId = version ? `${packageName}@${version}` : packageName;
    console.log(`Installing ${packageId}...`);

    return { path: `./node_modules/${packageName}`, version: version || "latest" };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export default OmniCloudAPI;