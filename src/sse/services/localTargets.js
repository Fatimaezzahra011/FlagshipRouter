// Local / custom model providers as the last fallback behind every public rename.
//
// Any OpenAI- or Anthropic-compatible endpoint added in the dashboard (Ollama, LM Studio,
// llama.cpp, vLLM, Jan, LocalAI, …) with an active connection is appended to the rename's
// target pool, after the built-in free targets. Well-known local servers (Ollama, LM Studio)
// are also detected automatically and registered once, so they work with no setup.
//
// Which model a provider serves: the connection's defaultModel, else the first model the
// endpoint lists at GET {baseUrl}/models (cached for a few minutes).
import { getProviderNodes, createProviderNode } from "@/lib/db/repos/nodesRepo.js";
import { getProviderConnections, createProviderConnection } from "@/lib/db/repos/connectionsRepo.js";
import { OPENAI_COMPATIBLE_PREFIX } from "@/shared/constants/providers";
import { LOCAL_PROVIDERS } from "open-sse/config/brand.js";

const MODEL_CACHE_MS = 5 * 60 * 1000;
const MISS_CACHE_MS = 20 * 1000; // a server that is down is rechecked sooner
const DETECT_EVERY_MS = 60 * 1000;
const PROBE_TIMEOUT_MS = 1500;

// Local servers detected and registered automatically when they are running.
const AUTO_DETECT = LOCAL_PROVIDERS.autoDetect;

const modelCache = new Map(); // baseUrl → { at, model }
let lastDetect = 0;
let detecting = null;

const trimSlash = (url) => String(url || "").replace(/\/+$/, "");

async function fetchFirstModel(baseUrl, apiKey) {
  const key = trimSlash(baseUrl);
  const cached = modelCache.get(key);
  if (cached && Date.now() - cached.at < (cached.model ? MODEL_CACHE_MS : MISS_CACHE_MS)) return cached.model;
  let model = null;
  try {
    const res = await fetch(`${key}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : [];
      // Skip embedding-only models; they cannot answer chat requests.
      const chat = list.find((m) => !/embed/i.test(m?.id || m?.name || "")) || null;
      model = chat ? (chat.id || chat.name || null) : null;
    }
  } catch { /* not running */ }
  modelCache.set(key, { at: Date.now(), model });
  return model;
}

async function detectLocalServers(nodes) {
  if (!AUTO_DETECT.length || Date.now() - lastDetect < DETECT_EVERY_MS) return false;
  if (detecting) return detecting;
  lastDetect = Date.now();
  detecting = (async () => {
    let added = false;
    const known = new Set(nodes.map((n) => trimSlash(n.baseUrl)));
    const prefixes = new Set(nodes.map((n) => n.prefix));
    for (const server of AUTO_DETECT) {
      if (known.has(trimSlash(server.baseUrl)) || prefixes.has(server.prefix)) continue;
      if (!(await fetchFirstModel(server.baseUrl))) continue;
      try {
        const node = await createProviderNode({
          id: `${OPENAI_COMPATIBLE_PREFIX}chat-${server.prefix}-local`,
          type: "openai-compatible",
          prefix: server.prefix,
          apiType: "chat",
          baseUrl: trimSlash(server.baseUrl),
          name: server.name,
        });
        await createProviderConnection({
          provider: node.id,
          authType: "apikey",
          name: server.name,
          apiKey: "local",
          isActive: true,
          providerSpecificData: { prefix: node.prefix, apiType: node.apiType, baseUrl: node.baseUrl, nodeName: node.name },
        });
        added = true;
      } catch { /* policy off or already there */ }
    }
    return added;
  })().finally(() => { detecting = null; });
  return detecting;
}

/**
 * Extra rename targets ("<node id>/<model>") for every connected local/custom provider.
 * Never throws: on any failure the rename simply keeps its built-in targets.
 */
export async function getLocalTargets() {
  if (!LOCAL_PROVIDERS.enabled) return [];
  try {
    const load = async () => [
      ...(await getProviderNodes({ type: "openai-compatible" })),
      ...(await getProviderNodes({ type: "anthropic-compatible" })),
    ];
    let nodes = await load();
    if (await detectLocalServers(nodes)) nodes = await load();
    if (!nodes.length) return [];

    const active = await getProviderConnections({ isActive: true });
    const targets = [];
    for (const node of nodes) {
      const conn = active.find((c) => c.provider === node.id);
      if (!conn) continue;
      const model = conn.defaultModel
        || (node.type === "openai-compatible" ? await fetchFirstModel(node.baseUrl, conn.apiKey) : null);
      // The node id is unique and never collides with a built-in provider alias (e.g. "ollama").
      if (model) targets.push(`${node.id}/${model}`);
    }
    return targets;
  } catch {
    return [];
  }
}
