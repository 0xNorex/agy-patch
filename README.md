# agy-patch

Reversible patcher for **Antigravity CLI (`agy`)** and **Antigravity Desktop** on Linux x86-64:

- **`cli` (`agy`)**: disables automatic checkpoint/compaction, removes the `256000` token clamp, raises internal context limits to `983040`, and exposes context-window presets for all models.
- **`desktop-context` (`resources/bin/language_server`)**: disables automatic checkpoint/compaction, removes the `256000` clamp, raises default max token limit and `max_context_tokens` to `983040`.
- **`desktop-zh` (`resources/app.asar`)**: lossless Simplified Chinese (`zh-CN`) localization for Antigravity Desktop — injects a guarded `MutationObserver` DOM engine into Electron preloads plus native main-process menu, tray, right-click context menu, and dialog translations.

## Design Guarantees

- **Zero dependencies**: Single Python 3.8+ stdlib script + JSON dictionary (`dicts/zh-CN.json`) and preload engine (`assets/zh-cn-engine.js`). Never uses network at runtime.
- **Fail-closed verification**:
  - ELF Go binaries (`agy`, `language_server`) are verified via `PT_LOAD`, `.rela.dyn`, `pclntab`, and `moduledata`; aborts without writing on unknown hashes or non-unique signatures.
  - `app.asar` is parsed and rewritten in-memory while preserving all `unpacked` entries (e.g. `chrome-devtools-mcp`), recomputing SHA256 block `integrity` headers, and refusing partial/ambiguous anchors or running Desktop processes.
- **Hash-bound rollback**: Backups and manifests in `$XDG_STATE_HOME/agy-patch` (default `~/.local/state/agy-patch`) are SHA256-verified before every `apply` and `restore`.

> Unofficial local patcher, not affiliated with Google / Antigravity.

## Quick Start

```bash
git clone https://github.com/0xNorex/agy-patch.git
cd agy-patch && chmod +x agy-patch
ln -s "$PWD/agy-patch" ~/.local/bin/agy-patch   # optional

agy-patch status                              # inspect detected CLI & Desktop targets
agy-patch apply --dry-run                     # verify all edits without writing
agy-patch apply                               # backup -> atomic replace -> manifest
agy-patch restore                             # verify hashes and roll back
```

Select specific targets with `--target`:

```bash
agy-patch apply --target cli                  # only agy CLI
agy-patch apply --target desktop              # desktop-context + desktop-zh
agy-patch apply --target desktop-context      # only Desktop language_server
agy-patch apply --target desktop-zh           # only Desktop zh-CN localization
agy-patch apply --target all                  # CLI + both Desktop targets
```

> Pass `--binary /real/path/to/agy` if `agy` in `PATH` is a symlink, or `--desktop-dir /path/to/antigravity` if Desktop is installed in a custom directory (auto-detects `~/.local/opt/antigravity`, `/opt/antigravity`, or `antigravity` in `PATH`).

## Supported Builds

| Target | Version | Original SHA256 | Status |
| --- | --- | --- | --- |
| `cli` (`agy`) | `1.5.9` | `39816d49d5ab92229952987225c23ea3fed7580699dcb4a444e0388e0ac1ce43` | Verified |
| `cli` (`agy`) | `1.5.8` | `9db59b6371107b939befa9c507c0a24989fda974e75d81d8529f3689ef7322e5` | Verified |
| `cli` (`agy`) | `1.5.7` | `5df525a2d6908989c57b897723caea66e00d7c4d2e24411f91ad306989574642` | Verified |
| `desktop-context` (`language_server`) | `2.32.1` | `4847eb0024fc54fd6ba9d860aad1767e4cc2bdf19e80d2527acf82dd147fc66a` | Verified |
| `desktop-zh` (`app.asar`) | `2.32.1` | `5b493943e67e500638555315594d5b1acbc7a02e6dac3c786651921c1ee8519f` | Verified |

## What It Patches

### 1. Context & Compaction (`cli`: 8 edits / 32 bytes; `desktop-context`: 6 backend edits)

| Target Go Symbol | Effect | Scope |
| --- | --- | --- |
| `utils.GetCheckpointConfig` | Remove `256000` clamp; set default `MaxTokenLimit` to `983040`; `Enabled = false` | `cli`, `desktop-context` |
| `utils.GetDefaultCheckpointConfigForModel` | Set `CheckpointConfig.Enabled = false` | `cli`, `desktop-context` |
| `config.applyFeatureProviderCheckpointOverrideConfig` | Skip experiment/feature-provider checkpoint override merge | `cli`, `desktop-context` |
| `serializers.DefaultSerializer.populateContextWindowMetadata` | Report `max_context_tokens = 983040` | `cli`, `desktop-context` |
| `model.SelectorModel.offersContextWindow` | Entry `mov al,1; ret` — show context-window options for all models | `cli` |
| `store.(*Store).ContextWindow` | Entry `jmp (*Store).ContextWindowChoice` — always use selected preset (e.g. `900K`) | `cli` |

### 2. Desktop Simplified Chinese (`desktop-zh`)

- **Preload DOM Engine (`dist/preload.js`, `dist/ideInstall/wizardPreload.js`)**: `MutationObserver` + `WeakMap` skip cache + Shadow DOM hook with `7,135` exact entries, `122` core words, and dynamic rules (quotas, durations, `Quote`, `Ask /btw`, React fragment anchoring). Strictly skips non-local URLs, user chat bubbles, thinking prose, code/Monaco/terminals, file trees (`role="tree"`), and icon fonts (`.google-symbols`, `.codicon`).
- **Native Electron UI**: patches `dist/menu.js`, `dist/tray.js`, `dist/ipcHandlers.js` (including `buildContextMenuTemplate` right-click menus & submenus), `dist/main.js`, `dist/updater.js`, `dist/ideInstall/wizardHtml.js`, `dist/deviceChooser.js`, `dist/webviewPopupSecurity.js`, `dist/webauthn.js`, `dist/cablev2.js`, and `dist/remote/*`.

## Credits & License

- Binary patching inspired by [justhil/agy-tool](https://github.com/justhil/agy-tool) and [LiraNuna's gist](https://gist.github.com/LiraNuna/4c058aed3f636f5193f920f64284ff26).
- Simplified Chinese dictionary incorporates MIT-licensed entries from [zhonghugo/antigravity-zh](https://github.com/zhonghugo/antigravity-zh) and [liominsb/Antigravity-Chinese-Localization](https://github.com/liominsb/Antigravity-Chinese-Localization), supplemented with `v2.32.1` UI strings.

MIT — see [LICENSE](LICENSE).
