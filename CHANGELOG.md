# Changelog

## v0.7.0 — 2026-11-28

### Features

- Run `ccs` with no arguments in a terminal to pick a provider from a list. Arrow keys move, Enter switches (user-level), Esc leaves everything as it is. For a provider with regions, a second list asks for the region. The top row goes back to Claude Code's native default. Outside a terminal, `ccs` prints the help and exits 1 (463a45c)
- `ccs -` goes back to the provider you had before the last switch or `ccs reset`, with the same region and model. Run it again to swap back. A provider you set by hand counts too, as long as ccs knows its URL (25cadbf)
- `ccs stepfun plan` uses StepFun's Step Plan subscription at `https://api.stepfun.ai/step_plan`. `ccs stepfun` still uses the pay-as-you-go API (8d74425)

### Bug Fixes

- A `settings.json` or `settings.local.json` that ccs could not read or parse used to count as empty, so the next switch or reset kept only the `env` block and deleted permissions, hooks and every other field. Now only a missing file counts as empty. For any other problem, switch, `ccs project`, `ccs -` and `ccs reset` stop with one line that names the file and change nothing. `ccs status` warns and keeps going (dce047d)
- ccs still accepts comments and trailing commas in a settings file, which Claude Code itself rejects, but it now writes plain JSON and says the comments were removed. A rewrite keeps the file's permissions; before, they became 0644 (dce047d)
- An unknown region name (`ccs stepfun paln`) prints an error with the valid regions and exits 1. Before, ccs switched to the provider's default URL without a word (8d74425)

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.6.0...v0.7.0

## v0.6.0 — 2026-11-28

### Features

- `ccs run <provider> [region]` starts Claude Code with a provider in this terminal only and writes no settings file, so two terminals can use two providers. Put claude's own flags after `--`, as in `ccs run glm -- --resume` (c79e4f2)
- `ccs test <provider> [region]` sends one short request for each model ID and prints one line per ID, so you find a wrong key, base URL or model ID before a Claude Code session fails on it. It exits 1 if any ID fails. The provider bills these requests. Qwen's Coding Plan terms ban automated calls, so for Qwen it warns and asks before it sends; `--accept` sends without asking (9fd4389)
- `--model <id>` works with `ccs run` and `ccs test` too (c79e4f2, 9fd4389)
- Custom providers: point ccs at an Anthropic-compatible endpoint it does not ship with, such as your own proxy or a LiteLLM or vLLM server. Add one with `ccs provider add <name> <baseUrl> -m <id>` or under `customProviders` in `~/.ccs/config.json`, and remove it with `ccs provider remove <name>`, which keeps the stored key (0253d13)

### Bug Fixes

- With `CLAUDE_CONFIG_DIR` set, ccs now reads and writes the `settings.json`, `.credentials.json`, `.claude.json` and macOS Keychain item that belong to that folder, the same ones Claude Code uses. Before, it changed the default files in `~/.claude` and `~/.claude.json`, which that session never read. `ccs status` shows the folder on a `Config dir` line (105c9cc)
- `ccs project <provider> -m <id>` now writes the model ID you give. Before, it wrote the provider's default model (c79e4f2)
- `ccs doctor` accepts Node.js 20, the minimum `package.json` allows (9fd4389)
- Ctrl+D at a y/N prompt now counts as no. Before, ccs exited 0 without an answer (9fd4389)
- An unknown provider name (`ccs nope`) prints one error line and exits 1. Before, it printed a stack trace (0253d13)

### Improvements

- If `~/.ccs/config.json` is not valid JSON or a custom entry has a wrong field, every command stops with one line that names the file and the field, and no command writes to the file until you fix it (0253d13)

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.5.0...v0.6.0

## v0.5.0 — 2026-11-27

### Features

- `ccs status` shows the Claude account you are logged in to (email and organization) and the credential Claude Code will use. It checks the shell and the user and project settings files in the order Claude Code reads them (82733a3)
- When a provider token or another credential outranks your `/login` account, `ccs status` and `ccs account switch` say where it comes from and how to remove it (82733a3)
- `ccs account list` puts a `*` next to the profile you are logged in with (82733a3)

### Bug Fixes

- On macOS, `ccs account save` and `ccs account switch` now read and write the login in the `Claude Code-credentials` Keychain item. Before, they used `~/.claude/.credentials.json`, which Claude Code reads only when the Keychain has no login (1c76fa1)
- A profile also saves the account email and organization (`oauthAccount` from `~/.claude.json`), and `switch` restores them (1c76fa1)
- `ccs account switch` first copies the current login into the profile with the same account and organization, because Claude Code refreshes the token after you save it. If no profile matches, it stops and changes nothing (1c76fa1)

**Full Changelog:** https://github.com/yagizdo/cc-provider-switcher/compare/v0.4.0...v0.5.0

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
