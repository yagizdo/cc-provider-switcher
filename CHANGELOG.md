# Changelog

## v0.1.0 — 2026-06-26

Initial release.

- CLI tool (`ccs`) for switching Claude Code between AI providers
- 9 built-in providers: deepseek, minimax, claude, kimi, qwen, glm, seed, stepfun, openrouter
- Region support for providers with multiple endpoints
- Multi-account credential snapshots (`ccs account save/switch/list/delete`)
- Project-scoped provider switching (`ccs project <provider>`)
- Status, list, config, reset, and doctor commands
- JSONC-safe `~/.claude/settings.json` manipulation via `comment-json`
