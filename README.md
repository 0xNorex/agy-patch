# agy-patch

为 Antigravity CLI（`agy`）Linux x86-64 二进制提供**可回滚的本地字节补丁**：关闭自动 checkpoint / compaction，解除 256k token 夹取，并把内置上下文窗口相关值提升到 UI 固定上限 983040，同时让模型选择器对所有模型显示上下文窗口选项。

- 单文件、仅用 Python 3 标准库，无第三方依赖。
- 只改 `agy` 可执行文件本身，**不修改**任何 settings、prompt、Electron/HUD。
- 所有修改在写入前逐字节校验；未知版本或签名不唯一时**直接失败且不写入**。
- 备份与 manifest 都以 SHA256 绑定；升级后不会把旧备份错恢复成现版本。

> 非官方项目，与 Google / Antigravity 无关。属于本地逆向补丁，请自行评估风险。

## 支持的版本

已在以下构建上验证（Linux x86-64 PIE、Go pclntab）：

| 版本 | SHA256（原始文件） | 说明 |
| --- | --- | --- |
| 1.5.8 | `9db59b6371107b939befa9c507c0a24989fda974e75d81d8529f3689ef7322e5` | 当前补丁目标 |
| 1.5.7 | `5df525a2d6908989c57b897723caea66e00d7c4d2e24411f91ad306989574642` | 已验证应用与回滚 |

`status` 会打印实际 SHA256；`apply` 只接受上表两个已验证原始哈希，同时要求全部签名匹配。新版本即使局部签名相同也会拒绝写入，须经核验后更新允许列表。

## 它改了什么（共 8 处等长替换）

| 符号 | 改动 |
| --- | --- |
| `cortex/utils/utils.GetCheckpointConfig` | 删除 checkpoint 预算的 256000（0x3e800）夹取，改用模型剩余的原始 token 预算 |
| 同上 | 默认 `MaxTokenLimit` 从 256000 改为 983040（0x000f0000） |
| 同上 | `CheckpointConfig.Enabled = false`（该字段实际是 `*bool`，位于结构 +0xb0） |
| `cortex/utils/utils.GetDefaultCheckpointConfigForModel` | `CheckpointConfig.Enabled = false` |
| `cortex/config/config.applyFeatureProviderCheckpointOverrideConfig` | 跳过 feature-provider / 实验配置合并分支（影响面较宽，属有意为之） |
| `oneharness/.../serializers.DefaultSerializer.populateContextWindowMetadata` | 上报的 `max_context_tokens` 固定为 983040 |
| `cli/model/model.SelectorModel.offersContextWindow` | 入口改为 `mov al,1; ret`：始终“提供”上下文窗口选项 |
| `cli/store/store.(*Store).ContextWindow` | 入口 5 字节改成 `jmp cli/store/store.(*Store).ContextWindowChoice`，保留用户选择的 preset |

### 关闭自动压缩的证据与边界

- 逆向确认：`CheckpointConfig.Enabled` 是 `*bool`（`GetEnabled` 对 nil 或 false 均返回 false）；二进制中只有两个构造点显式写入“true”，正是上表被改的两处。
- 其余构造路径（`withoutCheckpointing`、`GetCascadeConfigForCumulativePrompt`、`buildCascadeConfigInternal` 的新建配置等）产生的是 nil 或 false。
- 因此补丁后，读取该字段的 checkpoint 判定（例如框架 `checkpoint.shouldCheckpoint`、oneharness `hooks.checkpointNeeded`/ContextSummaryHook 相关路径）会看到 false。
- **仍然存在的未知**：远端服务端、远端实验配置或未来的新代码路径是否会在别处重新启用自动压缩，未做运行时验证（未验）。本工具只能保证上述二进制内可见路径。

## 关键未验证项（务必阅读）

1. **没有做真实网络的近 1M 上下文实测。** 983040 只是 `agy` UI 内部固定上限；模型/服务端是否接受 >256K 输入、计费与截断行为如何，均未验证（未验）。
2. **不保证手动 `/compact` 仍可用。** 手动压缩的判定路径与自动压缩不同（`manualCompactionRequested` 读用户输入），但未做端到端交互验证（未验）。若手动压缩失效，用 `restore` 回滚。
3. `offersContextWindow` 被强制为 true 后，选择器会给**没有服务端保证**的模型展示上下文窗口选项；选择后仍可能被服务端拒绝或表现异常。
4. 跳过实验合并分支会同时跳过整个 checkpoint 实验配置中的策略、阈值、摘要等其他字段，影响面比“仅关闭压缩”更大。
5. 只覆盖 x86-64 Linux 的 Go 构建；其他平台/打包方式（Electron 版、自动更新器替换后的新版本等）不支持。

## 三个容易混淆的数字

- **1048576**：1 Mi-token 的数值；实际模型／服务端容量未验证，本工具不修改服务端能力。
- **983040**：本补丁写入的固定 UI 上限，不是服务端容量证明。
- **900000**：建议在设置里选择的 preset（例如 `~/.gemini/antigravity-cli/settings.json` 中已有 900K 配置）。

本工具**不改 settings**。需要调整时用 `agy --settings` 或 `/model` 选择 preset；不要手工改 JSON。

## 安装

```bash
git clone https://github.com/0xNorex/agy-patch.git
cd agy-patch
chmod +x agy-patch
ln -s "$PWD/agy-patch" ~/.local/bin/agy-patch   # 可选
```

要求：Python 3.8+（只用标准库），Linux，目标二进制为 x86-64 ELF PIE。

> 本工具拒绝直接修补**符号链接**形式的二进制：`--binary` 必须指向真实文件（`readlink -f "$(command -v agy)"`）。

## 使用

```bash
agy-patch status                 # 只读：版本签名、补丁状态、manifest/备份校验
agy-patch apply --dry-run        # 校验并展示将修改的 8 处字节，不写文件
agy-patch apply                  # 备份 -> 原子替换 -> 写 manifest
agy-patch apply                  # 幂等：已打补丁且与 manifest 匹配时直接退出 0
agy-patch restore                # 用哈希校验过的备份原子回滚
agy-patch status --binary /path/to/agy
agy-patch apply  --binary /path/to/agy
```

退出码：`0` 成功/已知状态；`1` 拒绝或失败（未知 ELF、签名不唯一、哈希不匹配、并发修改等）。

## 备份、manifest 与升级流程

状态目录（可用环境变量覆盖）：

- 默认：`$XDG_STATE_HOME/agy-patch`，未设置时为 `~/.local/state/agy-patch`
- 覆盖：`AGY_PATCH_STATE_DIR=/path agy-patch ...`
- 内容：`backups/<original_sha256>.bin`、`manifests/<key>.json`
- 磁盘占用：备份与原子替换临时文件各需约一份二进制大小（当前约 280 MB × 2），完成后临时文件删除。

安全约束：

- 备份按**原始文件内容哈希**命名；已存在但哈希不符时拒绝覆盖。
- `apply` 在替换前校验：同一 inode/size/mtime、重新哈希仍等于原始哈希。
- 临时文件写入同目录，`fsync` 文件与目录，保留权限（尽力保留属主），再 `os.replace` 原子替换。
- manifest 绑定 `original_sha256` / `patched_sha256` / 备份路径 / 每处编辑的旧新字节。
- `restore` 仅在“当前文件哈希 == manifest 中的 patched 哈希”且“备份哈希 == original 哈希”时才执行；二进制在打补丁后被任何人改动过都会拒绝。
- `agy` 自动升级后：`status` 会提示签名未知/清单过期，`restore` 会拒绝（不会拿旧版本备份覆盖新版本）。新版本须经过核验并更新工具的哈希允许列表后才能重新运行 `apply`，**不要**手工用旧备份覆盖。

手工兜底（仅在工具不可用时）：

```bash
ls ~/.local/state/agy-patch/backups/
sha256sum <bak>.bin         # 必须等于 manifest 里的 original_sha256
cp <bak>.bin <agy真实路径>  # 确认目标哈希匹配后再覆盖
```

## 设计原则

- 通过 `PT_LOAD` 做虚拟地址/文件偏移转换；用 Go `pclntab` 与 `.rela.dyn` 的 `RELATIVE` 重定位链（`pclntab`、`pclntab+funcnameOffset`）唯一确定 moduledata，而不是“搜索第一个指针”。
- 校验 moduledata 的 `minpc == text`、16 字节对齐、可执行段、ftab 长度 `nfunc+1`，并逐条核对 18 万+ `_func.entryOff` 与 ftab 一致。
- 每个补丁要求目标符号唯一、旧签名在函数范围内唯一、新旧等长、区间不重叠；任何一项不满足即失败。
- 以已知构建的函数序言（prologue）做二次确认；`offersContextWindow` 的 `mov al,1; ret` 已核对 5 个调用点均 `test al,al`。
- `ContextWindow` 跳转目标 `ContextWindowChoice` 的动态相对位移在运行时计算并校验范围，同时校验两者为同一 `*Store` 方法。

## 验证方式（开发者）

```bash
# 只读状态（不会写入 live 文件）
./agy-patch status --binary /path/to/agy

# 在一次性副本上演练
cp /path/to/agy /tmp/agy.test
./agy-patch apply  --binary /tmp/agy.test
./agy-patch status --binary /tmp/agy.test
/tmp/agy.test --version
./agy-patch restore --binary /tmp/agy.test
sha256sum /tmp/agy.test   # 应等于原始哈希

# 负例：符号链接、未知 ELF、被改动后的 restore 都应拒绝
```

本地字节与启动验收标准是“与原始文件逐字节比较，只出现预期的 32 个字节差异”，并确认补丁后的 ELF 仍可启动（`--version`）；这不能替代模型请求和压缩行为的端到端验证。

## 已知缺口 / 未做

- 未做真实模型请求、近 1M 上下文或自动/手动压缩的端到端测试（未验）。
- 未审计服务端与远端实验是否会重新启用自动压缩。
- 未支持非 Linux x86-64、非 Go 构建、符号链接目标。
- 不包含任何二进制、备份或用户私有路径；也不包含测试文件。

## 来源与致谢

- <https://github.com/justhil/agy-tool>
- <https://gist.github.com/LiraNuna/4c058aed3f636f5193f920f64284ff26>

以上仅作思路启发；本仓库代码为独立实现，未复制其完整代码。

## License

MIT，见 [LICENSE](LICENSE)。
