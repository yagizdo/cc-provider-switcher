# cc-provider-switcher

[![npm version](https://img.shields.io/npm/v/cc-provider-switcher.svg)](https://www.npmjs.com/package/cc-provider-switcher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Switch Claude Code between AI providers with one command.

```sh
ccs deepseek          # switch to DeepSeek
ccs minimax china     # switch to MiniMax (China region)
ccs status            # show current provider
```

---

## Install

```sh
npm install -g cc-provider-switcher
```

Or use without installing:

```sh
npx cc-provider-switcher deepseek
```

## Updating

```sh
npm install -g cc-provider-switcher@latest
```

> `npm update` won't cross major versions — always use `@latest` to get the newest release.

---

## Quick start

1. **Install:** `npm i -g cc-provider-switcher`
2. **Add API keys:** `ccs config`
3. **Switch provider:** `ccs deepseek`
4. **Check status:** `ccs status`

---

## Thinking & effort support

ccs sets `ANTHROPIC_DEFAULT_*_MODEL_SUPPORTED_CAPABILITIES` so Claude Code knows which thinking features a provider supports. No extra steps needed after switching.

**Providers with effort control** (DeepSeek, GLM, Qwen, Kimi, StepFun):

```sh
ccs deepseek
# Claude Code now exposes /effort controls (low / medium / high)
# Use /effort high inside Claude Code — DeepSeek maps it to reasoning_effort internally
```

```sh
ccs glm
# Same, plus max_effort tier available
```

**MiniMax — adaptive thinking:**

```sh
ccs minimax
# MiniMax decides when to think based on task complexity — nothing to configure
# Note shown: "Only adaptive/disabled thinking (enabled returns 400)"
```

**Seed/Doubao — thinking on/off only:**

```sh
ccs seed
# Thinking is either on or off, no granular effort control
```

---

## Commands

| Command | Description |
|---------|-------------|
| `ccs <provider> [region]` | Switch Claude Code to a provider (user-level) |
| `ccs project <provider> [region]` | Switch for current project only |
| `ccs <provider> --model <id>` | Use one model ID for sonnet/opus/haiku (also works with `project`) |
| `ccs list` | List all available providers |
| `ccs status` | Show current provider, model, and API key |
| `ccs config` | Interactive API key setup |
| `ccs reset` | Remove ccs-managed settings and return to Claude Code's native default |
| `ccs reset --project` | Reset project-level settings |
| `ccs reset --all` | Reset both user and project settings |
| `ccs doctor` | Diagnose environment issues |
| `ccs account save <name>` | Save current Claude credentials |
| `ccs account switch <name>` | Restore saved credentials |
| `ccs account list` | List saved credential profiles |
| `ccs account delete <name>` | Delete a saved profile |

---

## Providers

| Name | Key | Aliases | Thinking | Regions |
|------|-----|---------|----------|---------|
| DeepSeek | `deepseek` | `ds` | effort | global |
| MiniMax | `minimax` | `mm` | adaptive | global, china |
| Kimi | `kimi` | `kimi2` | effort | global, china |
| Qwen | `qwen` | — | effort | global, china |
| GLM | `glm` | `glm5` | effort | global, china |
| Seed/Doubao | `seed` | `doubao` | on/off | global |
| StepFun | `stepfun` | `sf` | effort | global |
| OpenRouter | `openrouter` | `or` | passthrough | global |

Claude (Anthropic) isn't a switchable provider — it's Claude Code's own native default. Run `ccs reset` to return to it.

**Thinking column:**
- `effort` — reasoning_effort levels (low/medium/high)
- `adaptive` — adaptive thinking only (`enabled` causes 400 on this provider)
- `on/off` — thinking enabled/disabled, no effort control
- `passthrough` — depends on the model routed through OpenRouter

### Model mapping

When Claude Code picks haiku/sonnet/opus, ccs maps them to the actual model IDs below:

| Provider | Haiku | Sonnet | Opus |
|----------|-------|--------|------|
| DeepSeek | `deepseek-flash` | `deepseek-flash` | `deepseek-flash` |
| MiniMax | `MiniMax-M3.1-Flash` | `MiniMax-M3.1-Flash` | `MiniMax-M3.1-Flash` |
| Kimi | `kimi-k3.1-pro-highspeed` | `kimi-k3.1-pro` | `kimi-k3.1-pro` |
| Qwen | `qwen3.7-plus` | `qwen3.7-plus` | `qwen3.7-plus` |
| GLM | `glm-5.3-flash` | `glm-5.3` | `glm-5.3` |
| Seed/Doubao | `ark-code-latest` | `ark-code-latest` | `ark-code-latest` |
| StepFun | `step-3.7-flash` | `step-3.7-flash` | `step-3.7-flash` |
| OpenRouter | `anthropic/claude-haiku-5.5` | `anthropic/claude-sonnet-5.5` | `anthropic/claude-opus-5.5` |
| LM Studio | `qwen/qwen3.8-27b` | `qwen/qwen3.8-27b` | `qwen/qwen3.8-27b` |

Override any ID via `providerOverrides` in `~/.ccs/config.json` — see [Override model IDs](#override-model-ids).

---

## Configuration

### API keys

Run `ccs config` for interactive setup, or set environment variables:

```sh
export DEEPSEEK_API_KEY=sk-...
export MINIMAX_API_KEY=eyJ...
export KIMI_API_KEY=sk-...
```

Config file: `~/.ccs/config.json` (permissions: `0600`)

```json
{
  "keys": {
    "deepseek": "sk-...",
    "minimax": "eyJ..."
  },
  "defaults": {
    "region": "global"
  }
}
```

### Override model IDs

Update model IDs without waiting for a release:

```json
{
  "providerOverrides": {
    "deepseek": {
      "defaultModel": "deepseek-v4"
    }
  }
}
```

### LM Studio

`ccs lmstudio` (alias `lms`) points Claude Code at `http://127.0.0.1:1234`. Start the LM Studio server first. No API key needed. To use another model, pass it with `--model`:

```bash
ccs lmstudio --model my/model-id
```

To make it permanent, override all four model fields (overrides replace `models` as a whole):

```json
{
  "providerOverrides": {
    "lmstudio": {
      "defaultModel": "my/model-id",
      "models": { "sonnet": "my/model-id", "opus": "my/model-id", "haiku": "my/model-id" }
    }
  }
}
```

Use the "API Model Identifier" shown in LM Studio. Set the context length to 32k or more.

### What ccs writes

ccs modifies only the `env` block in Claude Code settings. It never touches other fields (permissions, hooks, etc.).

**User-level:** `~/.claude/settings.json`
**Project-level:** `.claude/settings.local.json`

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_MODEL": "deepseek-flash",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-flash",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-flash",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-flash",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-flash",
    "ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES": "effort,thinking",
    "ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES": "effort,thinking",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES": "effort,thinking"
  },
  "ccsManaged": true
}
```

---

## Multi-account management

Save and restore Claude Pro credentials:

```sh
ccs account save work       # save current credentials as "work"
ccs account save personal   # save as "personal"
ccs account switch work     # restore "work" credentials
ccs account list            # list all saved accounts
ccs account delete personal # delete "personal"
```

Credentials are stored in `~/.ccs/accounts/` with `0600` permissions.

---

## Adding providers

Add an entry to `src/providers/providers.json` and submit a PR:

```json
{
  "myprovider": {
    "name": "My Provider",
    "baseUrl": "https://api.myprovider.com/anthropic",
    "defaultModel": "my-model-v1",
    "aliases": ["mp"],
    "keyEnvVar": "MYPROVIDER_API_KEY",
    "models": {
      "sonnet": "my-model-v1",
      "opus": "my-model-v1",
      "haiku": "my-model-v1"
    },
    "supportedCapabilities": ["effort", "thinking"],
    "thinkingNote": "Optional note shown after ccs switch"
  }
}
```

**Optional fields:**
- `supportedCapabilities` — Claude Code capability strings to declare (`effort`, `thinking`, `adaptive_thinking`, `max_effort`). Sets `ANTHROPIC_DEFAULT_*_MODEL_SUPPORTED_CAPABILITIES` env vars so Claude Code enables effort/thinking controls.
- `thinkingNote` — shown as an info line after switching, to warn about provider-specific limits.
- `regions` — map of region name → base URL.

---

## License

MIT
