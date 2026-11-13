# agy-patch

Reversible byte-level patcher for **Antigravity CLI (`agy`)** on Linux x86-64: disables automatic checkpoint/compaction, removes the `256000` token clamp, raises internal context limits to `983040`, and exposes context-window presets for all models.

- **Zero dependencies**: Single Python 3.8+ stdlib script; never touches settings, prompts, or Electron files.
- **Fail-closed verification**: Locates Go symbols via `PT_LOAD`, `.rela.dyn`, `pclntab`, and `moduledata`; aborts without writing on unknown hashes or non-unique signatures.
- **Hash-bound rollback**: Backups and manifests are SHA256-verified before every `apply` and `restore`.

> Unofficial local binary patcher, not affiliated with Google / Antigravity.

## Quick Start

```bash
git clone https://github.com/0xNorex/agy-patch.git
cd agy-patch && chmod +x agy-patch
ln -s "$PWD/agy-patch" ~/.local/bin/agy-patch   # optional

agy-patch status                 # read-only check
agy-patch apply --dry-run        # preview all 8 byte edits
agy-patch apply                  # backup -> atomic replace -> manifest
agy-patch restore                # verify hashes and roll back
```

> Pass `--binary /real/path/to/agy` if `agy` in `PATH` is a symlink (`readlink -f "$(command -v agy)"`).

## Supported Builds

| Version | Original SHA256 | Status |
| --- | --- | --- |
| `1.5.8` | `9db59b6371107b939befa9c507c0a24989fda974e75d81d8529f3689ef7322e5` | Current target |
| `1.5.7` | `5df525a2d6908989c57b897723caea66e00d7c4d2e24411f91ad306989574642` | Verified apply & restore |

## What It Patches (8 Edits, 32 Bytes)

| Target Go Symbol | Effect |
| --- | --- |
| `utils.GetCheckpointConfig` | Remove `256000` (`0x3e800`) clamp; set default `MaxTokenLimit` to `983040` (`0x000f0000`); set `Enabled = false` |
| `utils.GetDefaultCheckpointConfigForModel` | Set `CheckpointConfig.Enabled = false` |
| `config.applyFeatureProviderCheckpointOverrideConfig` | Skip experiment/feature-provider checkpoint override merge |
| `serializers.DefaultSerializer.populateContextWindowMetadata` | Report `max_context_tokens = 983040` |
| `model.SelectorModel.offersContextWindow` | Entry `mov al,1; ret` — show context-window options for all models |
| `store.(*Store).ContextWindow` | Entry `jmp (*Store).ContextWindowChoice` — always use selected preset (e.g. `900K`) |

<details>
<summary>Numbers, Storage & Caveats (click to expand)</summary>

- **Three numbers**: `1048576` is 1 Mi-token; `983040` is the patched UI ceiling; `900000` (`900K`) is the recommended preset selected via `agy --settings` or `/model`.
- **State directory**: `$XDG_STATE_HOME/agy-patch` (default `~/.local/state/agy-patch`), storing `backups/<original_sha256>.bin` and `manifests/<key>.json`. Override with `AGY_PATCH_STATE_DIR`.
- **Upgrades**: After `agy` auto-updates, `status` reports an unknown build and `restore` refuses to overwrite the new binary with an old backup.
- **Unverified**: Server acceptance above `256K`, remote experiment overrides, and manual `/compact` end-to-end behavior have not been runtime-tested.

</details>

## Credits & License

Inspired by [justhil/agy-tool](https://github.com/justhil/agy-tool) and [LiraNuna's gist](https://gist.github.com/LiraNuna/4c058aed3f636f5193f920f64284ff26) (independent clean-room implementation).

MIT — see [LICENSE](LICENSE).
