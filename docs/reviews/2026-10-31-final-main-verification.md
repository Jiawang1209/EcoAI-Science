# 本地 main 最终验收

本轮基于 `bd7dd25e`，检查安装引导、配置继承及最后的依赖变更。仅本地提交、合并，不推送、不发布，也不替换已安装应用。

## 安装和更新约定

- 新安装及手动重装从四步引导第 1 步开始；恢复钥匙串、保存 API Key 或检测解释器不会自动翻页或关闭引导。
- 同次安装的日常启动、后续应用内自动更新保留明确完成/跳过的状态，并沿用用户目录中的 API Key、R/Python 解释器配置。
- 从未安装过且无历史数据时，由用户手动填写 API Key、配置解释器；R/Python 仍可选。
- 用户已接受旧版首次升级的一次性引导。旧版缺少安装事务记录，不能可靠区分升级与保留数据的手动重装。

## 新披露依赖问题

最终审计发现 [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)：旧 minimatch 在预处理重复 `**/..` 模式时可能发生指数放大。原依赖图因此报告 21 个 moderate 项，归于同一个公告。

统一覆盖为上游修复版本 `minimatch@11.0.1`，同步锁文件；没有执行 `npm audit fix --force`，也没有降级打包工具。

直接升级会破坏仍在使用旧 CommonJS API 的 glob 7。`scripts/fix-minimatch-compat.mjs` 在项目 postinstall 中恢复可调用导出、`_glob` 与 `Symbol.match` 接口；匹配委托给上游非递归 Matcher，不恢复旧正则匹配或取消新的预处理数量限制。ESM 入口不变。脚本固定检查版本，并可重复执行。依赖升级后须复核该适配；旧调用方淘汰后可移除。

新增三项回归覆盖真实旧 glob 遍历、现代 ESM 命名导出和有界子进程中的对抗模式。全新 `npm ci` 已验证 postinstall 自动应用适配、SQLite 可开库、三项回归通过，审计为 0 漏洞；类型检查和完整构建通过。独立只读审查未发现新的兼容性或安全问题。

## 最终结果

- `npm test -- --maxWorkers=4`：559 文件，5846 通过，11 条件跳过，152.61 秒。
- `npm run typecheck`、`npm run build`、`git diff --check`：通过。构建保留已有 chunk 大小提示，非失败。
- Electron 5 个 spec：onboarding-startup、setup-wizard、first-run-default、i18n、update，21/21 通过，1.2 分钟。
- 新 Mac arm64 目录包：`release/20261031-final-minimatch/mac-arm64/EcoAI-Science.app`；`codesign --verify --deep --strict` 通过。
- 该包的 CLI 与 7 项原生基础自检全部通过，覆盖 SQLite、打包身份、自带资源、假模型对话及子进程、PTY、解释器探测和内核列表。
- 隔离打包引导脚本通过：恢复虚构凭证并完成核验后仍在第 1 步；手动走完四步后重启不重复；模拟换包并执行真实更新绑定函数后沿用完成状态；再次手动替换同版本包根目录后回到第 1 步，虚构旧凭证保留。已查看恢复凭证后的欢迎页截图。
- 日志：`/tmp/ecoai-dep-clean-final-{tests,typecheck,build,electron,pack,packaged-selftests,packaged-flow}.log`；审计 JSON：`/tmp/ecoai-dep-clean-final-audit.json`。打包引导证据目录：`/var/folders/2t/y0qcl9r50cv427189l7px1000000gn/T/ecoai-packaged-install-onboarding-Y8AOaX`。

## 验证边界

macOS 使用独立实体 node_modules、独立打包目录和临时用户资料测试；引导验收使用虚构凭证，不操作真实密钥、会话或解释器配置。Windows 安装身份逻辑与 NSIS hook 编译已有覆盖，尚无 Windows 真实安装、自动更新和重装的实机验收。
