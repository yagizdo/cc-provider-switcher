# cc-provider-switcher

[![npm version](https://img.shields.io/npm/v/cc-provider-switcher.svg)](https://www.npmjs.com/package/cc-provider-switcher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

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

---

## Quick start

1. **Install:** `npm i -g cc-provider-switcher`
2. **Add API keys:** `ccs config`
3. **Switch provider:** `ccs deepseek`
4. **Check status:** `ccs status`

---

## Commands

| Command | Description |
|---------|-------------|
| `ccs <provider> [region]` | Switch Claude Code to a provider (user-level) |
| `ccs project <provider> [region]` | Switch for current project only |
| `ccs list` | List all available providers |
| `ccs status` | Show current provider, model, and API key |
| `ccs config` | Interactive API key setup |
| `ccs reset` | Remove ccs-managed settings |
| `ccs reset --project` | Reset project-level settings |
| `ccs reset --all` | Reset both user and project settings |
| `ccs doctor` | Diagnose environment issues |
| `ccs account save <name>` | Save current Claude credentials |
| `ccs account switch <name>` | Restore saved credentials |
| `ccs account list` | List saved credential profiles |
| `ccs account delete <name>` | Delete a saved profile |

---

## Providers

| Name | Key | Aliases | Regions |
|------|-----|---------|---------|
| DeepSeek | `deepseek` | `ds` | global |
| MiniMax | `minimax` | `mm` | global, china |
| Kimi | `kimi` | `kimi2` | global, china |
| Qwen | `qwen` | — | global, china |
| GLM | `glm` | `glm5` | global, china |
| Seed/Doubao | `seed` | `doubao` | global |
| StepFun | `stepfun` | `sf` | global |
| OpenRouter | `openrouter` | `or` | global |
| Claude (Anthropic) | `claude` | `anthropic`, `sonnet` | global |

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

### What ccs writes

ccs modifies only the `env` block in Claude Code settings. It never touches other fields (permissions, hooks, etc.).

**User-level:** `~/.claude/settings.json`
**Project-level:** `.claude/settings.local.json`

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-chat",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-chat"
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
    }
  }
}
```

---

## vs. claude-code-switch

| | cc-provider-switcher | claude-code-switch |
|--|--|--|
| Distribution | npm (no install script) | bash script |
| Provider definitions | JSON registry | hardcoded functions |
| Adding providers | JSON entry | copy-paste bash function |
| Model IDs | User-overridable | Hardcoded |
| Tests | Vitest suite | None |
| Settings method | Direct `settings.json` write | `eval` + env vars |

---

## License

MIT
