# Changelog

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
