# EcoAI-Science：Windows 品牌修复合并 main 验收

日期：2026-10-29。用户明确授权“合并入 main”。本轮仅验证与整合，没有修改应用实现。

## 整合结果

在主仓库 `/Users/liuyue/Desktop/Github_repos/EcoAI-Science`，将 `codex/windows-icon-full-name` 的 `1be39eb0` 从基线 `d616d4b7` 快进合入本地 main。合并前两个工作树干净，刷新 origin 后确认没有待接入的远端 main 提交；没有冲突。保留修复分支及独立工作树。

该提交恢复 Windows 图标/产品资源写入并仅跳过证书签名，补齐七尺寸 EcoAI ICO，统一 HTML 和故障页窗口名称为 EcoAI-Science，并加入实际 PE、原生窗口名称和 Windows CI 检查。原品牌母图、Mac 图标和历史存储/加密身份保持不变。

## 本轮验证

- 合并前：6 文件、42 项相关回归及类型检查通过；独立只读复核无实证 P1/P2，另外 2 文件、12 项品牌/配置回归通过。
- 对已有三份 Windows EXE 重新校验，主图标各 7 帧与 EcoAI ICO 逐帧匹配，主程序 ProductName/FileDescription 为完整名称；全部文件 SHA-256 与先前实际构建清单一致。
- 对已有 macOS ARM64 验收包重新运行系统 Node CLI 和 7 项打包应用自测，通过完整窗口名、应用身份、配置隔离、模型替身往返、真实 PTY、解释器探测和内核列表。
- 合并后，在主仓库 main 重新进行类型检查、完整 Electron/CLI/UI 构建和 6 文件 42 项相关回归，全部通过。
- 使用重新构建的 main 运行真实 Electron 品牌/窗口/导出和状态栏 4 项验收，全部通过，包含 HTML title、BrowserWindow.getTitle() 与 app.getName() 的 EcoAI-Science 断言。
- 在 main 上再次执行实际 Windows 三份产物 PE 校验，通过；未重新跨构建这些已核对 SHA-256 的二进制文件。

证据、日志与截图位于 `/Users/liuyue/Documents/Codex/2026-10-29/ecoai-windows-branding/main-merge/`。Windows 产物仍是 Mac 跨构建的资源验证输出，未作 Windows 真机运行或安装验收，不能视为原生运行合格的发布包；原生 Windows CI 已接入资源和应用自测。

完成本地快进整合及合并后检查，随后将本记录与开发历史作为文档提交。未推送、发布、重打标签或替换已安装应用，版本仍为 0.0.2。
