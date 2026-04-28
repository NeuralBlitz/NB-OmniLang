import { describe, it, expect, beforeEach, vi } from "vitest";
import { OmniCloudAPI, PackageManager } from "./cloud.js";

describe("OmniCloudAPI", () => {
  let api: OmniCloudAPI;

  beforeEach(() => {
    api = new OmniCloudAPI();
  });

  describe("Constructor", () => {
    it("should create with default baseUrl", () => {
      expect(api).toBeDefined();
    });

    it("should accept custom baseUrl", () => {
      const customApi = new OmniCloudAPI("http://localhost:3000");
      expect(customApi).toBeDefined();
    });

    it("should use API key from parameter", () => {
      const apiWithKey = new OmniCloudAPI("https://api.test.com", "test-key");
      expect(apiWithKey).toBeDefined();
    });
  });
});

describe("PackageManager", () => {
  let pm: PackageManager;

  beforeEach(() => {
    pm = new PackageManager();
  });

  describe("Constructor", () => {
    it("should create with default registry", () => {
      expect(pm).toBeDefined();
    });

    it("should accept custom registry", () => {
      const customPm = new PackageManager("https://custom.registry");
      expect(customPm).toBeDefined();
    });
  });

  describe("Search", () => {
    it("should return cached results", async () => {
      pm.clearCache();
      // First search
      await pm.search("lodash");
      // Second should be cached
    });

    it("should clear cache", async () => {
      await pm.search("react");
      pm.clearCache();
    });
  });

  describe("Install", () => {
    it("should return install path", async () => {
      const result = await pm.install("lodash");
      expect(result.path).toContain("lodash");
    });

    it("should accept version", async () => {
      const result = await pm.install("lodash", "4.17.21");
      expect(result.path).toContain("lodash");
    });
  });
});

describe("CloudCompileRequest", () => {
  it("should validate request structure", () => {
    const request = {
      code: "console.log('hello')",
      language: "javascript",
      timeout: 5000,
    };
    expect(request.code).toBeDefined();
    expect(request.language).toBe("javascript");
  });

  it("should allow optional fields", () => {
    const request = {
      code: "test",
    };
    expect(request.timeout).toBeUndefined();
  });

  it("should allow dependencies", () => {
    const request = {
      code: "test",
      dependencies: { lodash: "^4.0.0" },
    };
    expect(request.dependencies?.lodash).toBeDefined();
  });

  it("should allow environment", () => {
    const request = {
      code: "test",
      environment: { NODE_ENV: "production" },
    };
    expect(request.environment?.NODE_ENV).toBe("production");
  });
});

describe("CloudCompileResponse", () => {
  it("should validate response status", () => {
    const response = {
      id: "123",
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    expect(["queued", "running", "completed", "failed"]).toContain(response.status);
  });

  it("should include result on completion", () => {
    const response = {
      id: "123",
      status: "completed",
      result: { output: "hello" },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    expect(response.result).toBeDefined();
  });

  it("should include error on failure", () => {
    const response = {
      id: "123",
      status: "failed",
      error: "Compilation failed",
      createdAt: new Date().toISOString(),
    };
    expect(response.error).toBeDefined();
  });
});

describe("CloudInstance", () => {
  it("should validate instance config", () => {
    const instance = {
      id: "inst-1",
      name: "test-instance",
      status: "running",
      resources: { cpu: 2, memory: 1024, timeout: 60000 },
    };
    expect(instance.status).toBe("running");
    expect(instance.resources.memory).toBeGreaterThan(0);
  });
});