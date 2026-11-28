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

**Providers with effort control** (DeepSeek, MiniMax, GLM, Qwen, Kimi, StepFun):

```sh
ccs deepseek
# Claude Code now exposes /effort controls (low / medium / high)
# Use /effort high inside Claude Code — DeepSeek maps it to reasoning_effort internally
```

```sh
ccs glm
# Same, plus max_effort tier available (also on MiniMax)
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
| `ccs` | Pick a provider from a list. Move with the arrow keys, press Enter to switch (user-level), or press Esc to leave everything as it is. For a provider with regions you then pick the region from a second list. The top row takes you back to Claude Code's native default. Outside a terminal, such as in a pipe or a script, `ccs` prints the help and exits with 1 |
| `ccs <provider> [region]` | Switch Claude Code to a provider (user-level) |
| `ccs project <provider> [region]` | Switch for current project only |
| `ccs run <provider> [region]` | Start Claude Code with a provider in this terminal only, without changing any settings file. Put claude's own flags after `--`: `ccs run glm -- --resume` |
| `ccs test <provider> [region]` | Send one short request for each model ID to check that the key, base URL and model IDs work. The provider bills these requests |
| `ccs <provider> --model <id>` | Use one model ID for sonnet/opus/haiku (also works with `project`, `run` and `test`) |
| `ccs -` | Go back to the provider you had before the last `ccs <provider>`, `ccs -` or `ccs reset`, with the same region and model (or to Claude Code's native default). Run it again to swap back. User-level settings only. ccs looks up the API key again, as a normal switch does |
| `ccs list` | List all available providers |
| `ccs status` | Show current provider, model, and API key |
| `ccs config` | Interactive API key setup |
| `ccs provider add <name> <baseUrl> -m <id>` | Add a custom provider: an Anthropic-compatible endpoint that ccs does not ship with |
| `ccs provider remove <name>` | Remove a custom provider. Its stored API key stays in the config file |
| `ccs reset` | Remove ccs-managed settings and return to Claude Code's native default |
| `ccs reset --project` | Reset project-level settings |
| `ccs reset --all` | Reset both user and project settings |
| `ccs doctor` | Diagnose environment issues |
| `ccs account save <name>` | Save current Claude credentials |
| `ccs account switch <name>` | Restore saved credentials |
| `ccs account list` | List saved credential profiles |
| `ccs account delete <name>` | Delete a saved profile |

`ccs -` remembers what `settings.json` held just before each switch, so a provider you set by hand counts too. If that URL matches no provider ccs knows, `ccs -` says so and changes nothing.

A `ccs run` session uses its provider even when `ccs <provider>` or `ccs project` set a different one; other sessions keep theirs. `ccs status` does not show a `ccs run` session.

In `ccs test`, a model passes when the provider answers with HTTP 200. Qwen's Coding Plan terms ban automated and non-interactive calls and say a key used that way can be blocked. They don't say whether one test request counts. So for Qwen, `ccs test` prints a warning and asks before it sends anything. `--accept` sends without asking. Without a terminal and without `--accept`, `ccs test` sends nothing.

---

## Providers

| Name | Key | Aliases | Thinking | Regions |
|------|-----|---------|----------|---------|
| DeepSeek | `deepseek` | `ds` | effort | global |
| MiniMax | `minimax` | `mm` | effort | global, china |
| Kimi | `kimi` | `kimi2` | effort | global, china |
| Qwen | `qwen` | — | effort | global, china |
| GLM | `glm` | `glm5` | effort | global, china |
| Seed/Doubao | `seed` | `doubao` | on/off | global |
| StepFun | `stepfun` | `sf` | effort | global |
| OpenRouter | `openrouter` | `or` | passthrough | global |
| LM Studio | `lmstudio` | `lms` | — | local |

Claude (Anthropic) isn't a switchable provider — it's Claude Code's own native default. Run `ccs reset` to return to it.

**Thinking column:**
- `effort` — reasoning_effort levels (low/medium/high)
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

### Custom providers

A custom provider is an Anthropic-compatible endpoint that ccs does not ship with, such as your own proxy or a LiteLLM or vLLM server. Add one with a command, then use it like a built-in provider:

```sh
ccs provider add myproxy https://proxy.example.com -m my-model
ccs test myproxy
ccs myproxy
```

`provider add` adds one entry to `~/.ccs/config.json`. Your keys and other settings stay as they are. The command does not take an API key, because every local user can read process arguments. Set `CCS_MYPROXY_API_KEY` or run `ccs config`.

You can also write the entry by hand. Only `baseUrl` and `models.sonnet` are required:

```json
{
  "customProviders": {
    "myproxy": {
      "baseUrl": "https://proxy.example.com",
      "models": { "sonnet": "my-model" }
    }
  }
}
```

Fields you leave out get these values:

- `name`: the entry's key (`myproxy`)
- `models.opus`, `models.haiku` and `defaultModel`: the value of `models.sonnet`
- `keyEnvVar`: `CCS_<NAME>_API_KEY`, with `-` changed to `_`
- `aliases`: none

The optional fields from [Adding providers](#adding-providers) work here too: `aliases`, `regions`, `supportedCapabilities` and `thinkingNote`, plus `testNote`, a warning `ccs test` prints before it sends anything. For a server that needs no key, set `"keyOptional": true`.

Names and aliases use lowercase letters, digits, `-` and `_`. A name or alias can't match a built-in provider or alias, a ccs command (`list`, `test`, `provider` and the rest), or `claude`, `anthropic` and `sonnet`. To change a built-in provider, use `providerOverrides`.

If the config file is not valid JSON, or a custom entry has a wrong field, every ccs command stops with one line that names the file and the field. No command writes to the file until you fix it.

`ccs provider remove myproxy` deletes the entry and keeps `keys.myproxy`, because many providers show a key only once. Delete the key from the file if you no longer need it. While it is there, `ccs provider add myproxy` refuses to run, so the old key never goes to a new URL.

### What ccs writes

ccs modifies only the `env` block in Claude Code settings. It never touches other fields (permissions, hooks, etc.).

**User-level:** `~/.claude/settings.json`, or `settings.json` in the `CLAUDE_CONFIG_DIR` folder when that variable is set
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

ccs reads and writes the login where Claude Code keeps it:

- macOS: the `Claude Code-credentials` item in the login Keychain. With `CLAUDE_CONFIG_DIR` set, Claude Code adds a hash of that value to the item name, and ccs uses the same name.
- Linux and Windows: `~/.claude/.credentials.json`, or `.credentials.json` in the `CLAUDE_CONFIG_DIR` folder

A profile also saves the `oauthAccount` block (the account email and organization) from `~/.claude.json`, or from `.claude.json` in the `CLAUDE_CONFIG_DIR` folder. `switch` writes it back.

ccs keeps profiles in `~/.ccs/accounts/` with `0600` permissions.

Quit every Claude Code session before you run `ccs account switch`, then start Claude Code again. A session left open can write its old login back when it refreshes its token.

Claude Code refreshes the login after you save it, so `switch` first copies the current login into the profile with the same account and organization. If no profile matches, `switch` stops and changes nothing. Run `ccs account save <name>` first.

### When a provider is active

While a provider is active, Claude Code does not use your `/login` account. `ccs <provider>` writes `ANTHROPIC_AUTH_TOKEN`, and Claude Code ranks that token above the login. `ccs account switch` still swaps the saved login, and Claude Code uses it again once you remove the provider with `ccs reset`.

`ccs status` shows the account you are logged in to and the credential Claude Code will use. When that credential is not the login, `ccs status` and `ccs account switch` say where it comes from and how to remove it. `ccs account list` puts a `*` next to the profile you are logged in with.

With a provider active and a login saved, Claude Code shows "Both ANTHROPIC_AUTH_TOKEN and /login managed key set · auth may not work as expected". This is expected: requests go to the provider with its token. Run `ccs reset` to go back to the login.

### Separate config folders

When `CLAUDE_CONFIG_DIR` is set, Claude Code reads its settings and login from that folder. Run ccs with the same value and it uses the folder too: `ccs <provider>`, `ccs reset`, `ccs status`, `ccs doctor` and `ccs account` read and write the files and the Keychain item that belong to it. `ccs status` prints the folder on a `Config dir` line.

```sh
export CLAUDE_CONFIG_DIR=~/.claude-work
ccs deepseek
claude
```

Write the value the same way each time. Claude Code builds the Keychain item name from the exact text, so on macOS `~/.claude-work` and `~/.claude-work/` hold two separate logins.

Saved profiles in `~/.ccs/accounts/` are shared by all folders, and `ccs account switch` writes a profile into the folder that is active. If one profile is active in two folders at the same time, both use the same login, and a token refresh in one folder may sign the other one out.

ccs does not handle Claude Code's opt-in Windows Credential Manager storage.

---

## Adding providers

To use a provider only on your machine, add it as a [custom provider](#custom-providers). To ship it with ccs, add an entry to `src/providers/providers.json` and submit a PR:

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
