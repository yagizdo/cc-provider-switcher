# Changelog

## v0.4.0 — 2026-11-09

### Features

- Add LM Studio provider (`ccs lmstudio`, alias `lms`) for local models at `http://127.0.0.1:1234`, no API key needed (2e24d38)
- Add `--model <id>` to `ccs <provider>` and `ccs project <provider>` to use one model ID for sonnet, opus and haiku (2e24d38)

### Improvements

- Update model IDs to November 2026 versions: DeepSeek `deepseek-flash` (V4-Pro requests now route to V4.1-Flash), MiniMax `MiniMax-M3.1-Flash`, Kimi `kimi-k3.1-pro` with `kimi-k3.1-pro-highspeed` for haiku, GLM `glm-5.3` with `glm-5.3-flash` for haiku, OpenRouter Claude 5.5 (8c9049e)
- Qwen opus now uses `qwen3.7-plus`, the only model Alibaba documents for the Coding Plan endpoint (8c9049e)
- MiniMax capabilities are now `effort,max_effort,thinking`: M3.1-Flash always thinks and returns 400 when thinking is disabled (8c9049e)
- Change StepFun base URL to `https://api.stepfun.ai`, the pay-as-you-go endpoint in StepFun's docs (8c9049e)

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.3.0...v0.4.0

## v0.3.0 — 2026-07-17

### Bug Fixes

- Fix OpenRouter's opus model ID, which was mistakenly pointing to `claude-fable-5` instead of `claude-opus-4.8` (dd80b39)

### Improvements

- Drop `claude` as a switchable provider — it's Claude Code's native default and `ccs reset` already restores it; hardcoding its model IDs was unnecessary maintenance risk (dd80b39)
- Update model IDs to latest 2026 versions: Claude to Sonnet 5 / Fable 5, Kimi to K3 (K2 deprecated May 2026), OpenRouter to matching `claude-sonnet-5` / `claude-fable-5` (a03166e)

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.2.2...v0.3.0

## v0.2.2 — 2026-06-29

### Improvements

- Lower minimum Node.js requirement from >=22 to >=20 (8a4b2a1)

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.2.1...v0.2.2

## v0.2.1 — 2026-06-26

### Bug Fixes

- Fix `ccs --version` always showing `0.1.0` by reading version from `package.json` at runtime instead of hardcoding it (2158e23)
- Add "Updating" section to README explaining that `npm install -g cc-provider-switcher@latest` is needed to cross major version boundaries (2158e23)

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.2.0...v0.2.1

## v0.2.0 — 2026-06-26

### Features

- Add thinking/effort support for third-party providers (ac41484) — declares `ANTHROPIC_DEFAULT_*_MODEL_SUPPORTED_CAPABILITIES` so Claude Code exposes `/effort` controls based on each provider's capabilities (effort, thinking, adaptive_thinking, max_effort).
- Updated model mappings to current IDs across all providers (0888621).
- Renamed provider display names for consistency (47baf84).

### Bug Fixes

- Clear stale capability env vars and correct MiniMax capabilities (500ad32) — MiniMax only supports adaptive thinking; `enabled` returns 400.

### Improvements

- Migrated npm publish to trusted publishers via OIDC (9a34d8e) — no more long-lived npm tokens in CI.

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.1.0...v0.2.0

## v0.1.0 — 2026-06-26

Initial release.

- CLI tool (`ccs`) for switching Claude Code between AI providers
- 9 built-in providers: deepseek, minimax, claude, kimi, qwen, glm, seed, stepfun, openrouter
- Region support for providers with multiple endpoints
- Multi-account credential snapshots (`ccs account save/switch/list/delete`)
- Project-scoped provider switching (`ccs project <provider>`)
- Status, list, config, reset, and doctor commands
- JSONC-safe `~/.claude/settings.json` manipulation via `comment-json`
