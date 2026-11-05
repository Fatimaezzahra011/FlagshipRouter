// Local / custom providers appended behind every public rename (src/sse/services/localTargets.js).
import { describe, it, expect, beforeEach, vi } from "vitest";

const nodes = [];
const connections = [];
const created = { nodes: [], connections: [] };

vi.mock("@/lib/db/repos/nodesRepo.js", () => ({
  getProviderNodes: async ({ type } = {}) => nodes.filter((n) => !type || n.type === type),
  createProviderNode: async (n) => { const node = { ...n }; nodes.push(node); created.nodes.push(node); return node; },
}));
vi.mock("@/lib/db/repos/connectionsRepo.js", () => ({
  getProviderConnections: async ({ isActive } = {}) => connections.filter((c) => isActive === undefined || c.isActive === isActive),
  createProviderConnection: async (c) => { connections.push(c); created.connections.push(c); return c; },
}));
vi.mock("@/shared/constants/providers", () => ({ OPENAI_COMPATIBLE_PREFIX: "openai-compatible-" }));
vi.mock("open-sse/config/brand.js", async (importOriginal) => ({
  ...(await importOriginal()),
  LOCAL_PROVIDERS: { enabled: true, autoDetect: [{ name: "Ollama", prefix: "local-ollama", baseUrl: "http://localhost:11434/v1" }] },
}));

function mockFetch(byUrl) {
  globalThis.fetch = vi.fn(async (url) => {
    const body = byUrl[url];
    if (!body) throw new Error("ECONNREFUSED");
    return { ok: true, json: async () => body };
  });
}

let getLocalTargets;
beforeEach(async () => {
  nodes.length = 0; connections.length = 0; created.nodes.length = 0; created.connections.length = 0;
  vi.resetModules();
  ({ getLocalTargets } = await import("../../src/sse/services/localTargets.js"));
});

describe("getLocalTargets", () => {
  it("returns nothing when no local server runs and none is configured", async () => {
    mockFetch({});
    expect(await getLocalTargets()).toEqual([]);
    expect(created.nodes).toEqual([]);
  });

  it("auto-registers a running Ollama once and targets its first chat model by node id", async () => {
    mockFetch({ "http://localhost:11434/v1/models": { data: [{ id: "nomic-embed-text" }, { id: "qwen3:8b" }] } });
    const targets = await getLocalTargets();
    expect(created.nodes).toHaveLength(1);
    expect(created.nodes[0]).toMatchObject({ type: "openai-compatible", prefix: "local-ollama", baseUrl: "http://localhost:11434/v1" });
    expect(created.connections[0]).toMatchObject({ provider: created.nodes[0].id, isActive: true });
    expect(targets).toEqual([`${created.nodes[0].id}/qwen3:8b`]);
    // A second call reuses the node instead of creating another.
    await getLocalTargets();
    expect(created.nodes).toHaveLength(1);
  });

  it("uses any user-added endpoint with its chosen default model", async () => {
    mockFetch({});
    nodes.push({ id: "openai-compatible-chat-abc", type: "openai-compatible", prefix: "vllm", baseUrl: "http://10.0.0.5:8000/v1" });
    nodes.push({ id: "anthropic-compatible-def", type: "anthropic-compatible", prefix: "mine", baseUrl: "http://localhost:9000/v1" });
    connections.push({ provider: "openai-compatible-chat-abc", isActive: true, defaultModel: "llama-4" });
    connections.push({ provider: "anthropic-compatible-def", isActive: true, defaultModel: "local-claude" });
    expect(await getLocalTargets()).toEqual(["openai-compatible-chat-abc/llama-4", "anthropic-compatible-def/local-claude"]);
  });

  it("skips endpoints without an active connection", async () => {
    mockFetch({});
    nodes.push({ id: "openai-compatible-chat-off", type: "openai-compatible", prefix: "off", baseUrl: "http://localhost:1/v1" });
    connections.push({ provider: "openai-compatible-chat-off", isActive: false, defaultModel: "x" });
    expect(await getLocalTargets()).toEqual([]);
  });
});
