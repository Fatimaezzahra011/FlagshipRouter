// Brand accessor (ESM). Every product name, data-dir, CLI-tool provider key and model prefix
// is read from /brand.json — rename the product there, never by editing strings in code.
// CommonJS callers (cli/, src/mitm/) read the same file through cli/src/brand.js or require().
import RAW from "../../brand.json" with { type: "json" };

const slug = RAW.slug;
const branch = RAW.branch || "main";
const repository = (RAW.repository || "").replace(/\/+$/, "");
const github = repository.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);

export const BRAND = Object.freeze({
  name: RAW.name,
  slug,
  // Provider key written into CLI tool configs, so models show up as `${modelPrefix}/<model>`.
  modelPrefix: RAW.modelPrefix || slug,
  tagline: RAW.tagline || "",
  description: RAW.description || "",
  repository,
  branch,
  githubRepo: github ? `${github[1]}/${github[2]}` : "",
  rawBaseUrl: github ? `https://raw.githubusercontent.com/${github[1]}/${github[2]}/refs/heads/${branch}` : "",
  npmPackage: slug,
  cliCommand: slug,
  // ~/.{dataDirName} on macOS/Linux, %APPDATA%/{dataDirName} on Windows.
  dataDirName: slug,
  updateCheck: RAW.updateCheck === true,
});

// Public model renames: clients see `id`/`name`, the router calls `target` ("alias/model").
// `targets` lists several free models in order; when one is unavailable the next one answers. `target` is always the first of them.
const renameTargets = (r) => (Array.isArray(r.targets) ? r.targets : [r.target])
  .filter((t) => typeof t === "string" && t.includes("/"))
  .map((t) => t.trim());

export const MODEL_RENAMES = Object.freeze(
  (RAW.models?.renames || [])
    .filter((r) => r && typeof r.id === "string" && renameTargets(r).length > 0)
    .map((r) => {
      const targets = Object.freeze(renameTargets(r));
      return Object.freeze({
        id: r.id.trim(),
        name: (r.name || r.id).trim(),
        target: targets[0],
        targets,
        hideTarget: r.hideTarget !== false,
      });
    }),
);

// Which registry entries the product exposes. Categories and the hasFree flag come from each
// open-sse/providers/registry/{id}.js entry; the rule itself lives in providers/policy.js.
const policy = RAW.providers || {};
export const PROVIDER_POLICY = Object.freeze({
  freeOnly: policy.freeOnly !== false,
  categories: Object.freeze([...(policy.categories || ["free", "freeTier"])]),
  includeHasFree: policy.includeHasFree !== false,
  include: Object.freeze([...(policy.include || [])]),
  exclude: Object.freeze([...(policy.exclude || [])]),
  customEndpoints: policy.customEndpoints === true,
});

// Local / custom providers (Ollama, LM Studio, any OpenAI-compatible endpoint) appended to every
// rename's pool after its built-in targets. autoDetect lists servers registered automatically
// when they are running; src/sse/services/localTargets.js does the work.
const local = RAW.localProviders || {};
export const LOCAL_PROVIDERS = Object.freeze({
  enabled: local.enabled !== false,
  autoDetect: Object.freeze((Array.isArray(local.autoDetect) ? local.autoDetect : [
    { name: "Ollama", prefix: "local-ollama", baseUrl: "http://localhost:11434/v1" },
    { name: "LM Studio", prefix: "local-lmstudio", baseUrl: "http://localhost:1234/v1" },
  ]).filter((p) => p && p.prefix && p.baseUrl).map((p) => Object.freeze({ ...p }))),
});
