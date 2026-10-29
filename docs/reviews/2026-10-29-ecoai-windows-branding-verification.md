# EcoAI-Science：Windows 图标与窗口完整名称修复

日期：2026-10-29。用户报告 macOS 图标正确、Windows 显示原生图标，并确认短名称出现在窗口顶部。基线 main `d616d4b7`，独立工作树 `/Users/liuyue/.codex/worktrees/windows-branding/EcoAI-Science`，修复分支 `codex/windows-icon-full-name`。

## 根因与改动

Windows 配置原为 `signAndEditExecutable: false`。本机 electron-builder 实现会在该值为 false 时直接跳过 `signAndEditResources`，因此 EXE 保留 Electron 的默认图标和版本资源。不能把“关闭证书签名”与“关闭图标/产品信息编辑”共用此开关。当前项目也没有显式提供 Windows ICO。

现在启用资源编辑，仅通过 `signExecutable: false` 跳过证书签名；显式设置应用、安装器和卸载器 ICO。七尺寸（16/24/32/48/64/128/256）ICO 从当前已接受的 EcoAI 三叶 `icon.png` 生成。`make-icon` 会同步生成 ICO，新增 `--windows-only` 可只转换当前 PNG。原 PNG/SVG、Logo 母图与托盘资源没有改动；没有引入 DAWN 的 RP 图标。

当前 Mac 安装版的 CFBundleDisplayName、CFBundleName、CFBundleExecutable 已是 EcoAI-Science，本次不修改安装版。短窗口名实际来自 `src/ui/index.html` 的 `<title>EcoAI</title>`，现改为完整名称，并同步连接耗尽画面的顶栏。正常 App 顶栏已是完整名称。内部存储、AUMID、加密身份与用户资料路径不变，版本仍为 0.0.2。

参考 DAWN `21036f46` 的 PE 资源检验方法新增 `scripts/verify-windows-branding.mjs`：比较实际 EXE 主图标组中每一帧的 SHA-256，不能以“任意附加图标含 EcoAI”冒充主图标正确；第一个参数为主程序，进一步要求所有版本字符串表中的 ProductName 和 FileDescription 都严格等于 EcoAI-Science。后续参数检查安装器/便携包图标。默认检查标准发布目录下的三份实际产物。Windows 原生 CI 打包后、上传前执行此检查。

`resedit` 1.7.2 原本已在锁文件的开发依赖树中；现显式声明为开发依赖供生成和验证使用，未改变版本或增加生产运行依赖。实际窗口测试和打包自测同时核对 HTML title、BrowserWindow.getTitle() 及 app.getName()。

## 验证

- 旧实现先失败：Windows 配置回归确认资源编辑被关闭；真实 Electron 窗口断言明确收到 EcoAI、预期 EcoAI-Science。
- 正反 PE 夹具覆盖正确图标和全名、缺图标、错误主图标但正确次图标、错误产品名、错误描述、缺版本资源；最终相关 6 文件、42 项回归全部通过，含配置、身份兼容、连接状态和 i18n。
- 类型、完整 Electron/CLI/UI 构建、脚本语法、发布身份核对及差异检查通过。
- 真实 Electron 品牌/布局/导出及状态栏 4 项通过；新增 HTML 与原生窗口标题断言通过。
- 实际跨构建 Windows x64 主程序、NSIS 安装器、portable。三个 EXE 的主图标各有 7 帧且逐帧匹配 EcoAI ICO，主程序的 ProductName/FileDescription 全名匹配。日志确认仅证书签名被跳过。
- 新 macOS ARM64 包构建成功，系统 Node CLI 与 7 项打包应用自测通过，包含全名、原生窗口标题、隔离配置、实际 PTY、模拟模型链路、解释器探测和内核列表。
- 独立只读复审未发现实证 P1/P2；另跑 7 项 Windows 品牌回归通过。已查看 ICO 256px 帧和实际应用截图。

证据、日志、SHA-256 清单及截图在 `/Users/liuyue/Documents/Codex/2026-10-29/ecoai-windows-branding/`。跨构建输出在工作树 `release/20261029-windows-branding/`，Mac 验收包在 `release/20261029-mac-branding/`。

## 交付边界

Windows 三份输出在 Mac 上跨构建，仅用于 PE 图标/元数据验证。没有在 Windows 真机运行安装器、应用、卸载器或观察 Explorer/任务栏缓存；平台原生模块未在 Windows 上重建，这些输出不能作为 Windows 运行合格的发布包。正式 Windows 构建继续由原生 Windows runner 生成，并运行新增资源检查及既有 CLI/应用自测。

仅提交修复分支。main 保持 d616d4b7，未合并、推送、发布、重打标签或替换现有安装应用；正式安装版需后续发布更新才能包含这些改动。

后续状态：已按用户授权复核并合入本地 main，见[合并验收记录](2026-10-29-ecoai-windows-branding-main-verification.md)。
