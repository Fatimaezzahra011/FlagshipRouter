# Changelog

## 1.5.0 — 2026-11-05

### Added
- Local and custom providers behind GPT-6 Astra and Claude Opus 5.5. Any OpenAI- or Anthropic-compatible endpoint you add in the dashboard (Ollama, LM Studio, llama.cpp, vLLM, Jan, LocalAI, …) answers after the built-in free models, so the two models keep working when the free cloud limits are reached.
- Ollama (`localhost:11434`) and LM Studio (`localhost:1234`) are detected automatically and registered when they are running, so they need no setup. The first chat model they list is used.
- The Providers page is enabled for adding custom endpoints (`brand.json` → `providers.customEndpoints`). `brand.json` → `localProviders` controls auto-detection.

## 1.4.1 — 2026-11-05

### Added
- `npm run launch` installs the [OpenCode](https://opencode.ai) CLI quietly in the background whenever it is missing, with no extra output. Thanks to the OpenCode team (SST).

## 1.4.0 — 2026-11-05

### Added
- GPT-6 Astra and Claude Opus 5.5 fall through to OpenRouter's free models after the OpenCode ones: Nemotron 3 Ultra, Nemotron 3.5 Super, Gemma 4 31B, Cohere North Mini Code, then OpenRouter's own free router. Add a free OpenRouter key in the dashboard to use them.

### Changed
- The free-limit message mentions adding a free OpenRouter key.

## 1.3.1 — 2026-11-05

### Changed
- GPT-6 Astra and Claude Opus 5.5 also try OpenCode's new free models, Pulse Alpha and Crouton Alpha, after the existing six.

## 1.3.0 — 2026-10-25

### Changed
- GPT-6 Astra and Claude Opus 5.5 are backed by OpenCode Free models only: Big Pickle first, then DeepSeek V4.1 Flash, GLM 5.3 Flash, MiMo V2.6 Flash and the two Nemotron 3.5 models when one is unavailable. All of them stay hidden from model lists.
- The free-limit message no longer points to other providers.
- Routing engine update: OpenCode Free reasoning fixes (GLM 5.3 Flash, DeepSeek V4.1 Flash, MiMo V2.6 Flash), combos move to the next model on request-scoped 4xx, credit/balance errors and empty streams, streamed tool calls always carry an id, SQLite writes strip NUL bytes, and `undici` 7.30.1.

## 1.2.0 — 2026-10-25

### Added
- GPT-6 Astra and Claude Opus 5.5 are each backed by several free models (`targets` in `brand.json`). When one is at its free limit or not connected, the next one answers. Connect a free Groq or OpenRouter key in the dashboard to add capacity.

### Changed
- When every model behind a public model is at its limit, clients get a clear "free usage limit reached" message instead of the raw upstream error.
- The second public model is "Claude Opus 5.5" (`claude-opus-5.5`).

## 1.1.0 — 2026-10-20

### Fixed
- OpenCode Free models work again: requests use OpenCode's new free-tier endpoint and client identity.

### Changed
- Routing engine update: newer provider fixes (OpenCode Zen/Go, Claude, Codex, Qoder and more), per-key model access controls on the Endpoint page, Hermes profile support, and the `connect` / `show` CLI commands for pointing local tools at a remote router.

## 1.0.0 — 2026-09-27

First FlagshipRouter release.

### Added
- `brand.json`: single source for the product name, CLI command, data folder, the provider key tools show on models, repository links and the provider policy. `npm run brand:sync` stamps it into both `package.json` files.
- Free-provider policy: only providers with a free offer (`free` / `freeTier` categories and `hasFree` entries) appear in the dashboard, can be connected, or receive routed traffic.
- Models screen (`/dashboard/models`, API `/api/models/catalog`): every model from the free providers with ready/connect status, filters and one-click test. It replaces the provider list.
- New dashboard design: signal-indigo palette, navy command rail with grouped navigation and live router status, copyable endpoint chip, new logo and icons.
- The CLI opens the browser UI as soon as the server is ready (`--no-browser` to skip).
- `npm run launch`: one command from a fresh clone — installs dependencies, builds the CLI bundle when missing or stale, and starts the CLI.

### Removed
- Gemini, Gemini CLI and Antigravity providers (`brand.json` → `providers.exclude`) and the Antigravity IDE card in CLI Tools. Their Google OAuth clients and Windsurf's Firebase key are no longer embedded in the code; they are read from `ANTIGRAVITY_OAUTH_CLIENT_*`, `GEMINI_CLI_OAUTH_CLIENT_*` and `WINDSURF_FIREBASE_API_KEY` if you re-enable those providers.
- Third-party promos, the Donate button, Google Analytics, the marketing landing page and docs site, and the default cloud-sync URL.
- Usage and Quota Tracker from the navigation (pages remain at their URLs).
- npm update checks until the package is published (`brand.json` → `updateCheck`).
