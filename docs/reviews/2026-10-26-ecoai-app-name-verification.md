# EcoAI-Science 安装应用名称核验

日期：2026-10-26。基线：`d4a9019a`。

## 原因与修正

Release 附件名已包含 EcoAI-Science，但 electron-builder 的 productName、executableName、DMG 标题以及 Electron ready 后的系统名称仍为 EcoAI。修正为完整名称 `EcoAI-Science`，同步托盘、打包自测和演练路径。旧包到新包的更新演练从实际 Info.plist 读取可执行名称，兼容 `EcoAI.app` 和 `EcoAI-Science.app`。

保留 appId、原有 userData、Electron ready 前的加密身份及内部协议，避免更名导致历史数据或凭证不可读。更新逻辑仍在原安装路径替换包，不自动重命名用户已有的安装目录。

## 验证

- 修复前，名称配置断言及 5 项系统身份断言因实际名称 EcoAI 而失败。
- `npx vitest run tests/packaging-config.test.ts tests/electron/product-identity.test.ts tests/update`：11 文件、70 项通过。
- `npm run typecheck`、`npm run build`：通过。
- `npx playwright test e2e/brand-export-menu.spec.ts e2e/tray.spec.ts e2e/update.spec.ts`：5 项通过。
- 5 个修改后的打包自测/演练脚本均通过 `node --check`。
- `npx electron-builder --mac --dir --arm64 --publish never --config.directories.output=release/name-verification`：成功。
- 实际应用路径：`release/name-verification/mac-arm64/EcoAI-Science.app`。Info.plist 的 CFBundleName、CFBundleDisplayName、CFBundleExecutable 均为 EcoAI-Science。
- `codesign --verify --deep --strict`：成功。
- 启动上述实际打包应用，确认 `app.isPackaged === true`、`app.getName() === 'EcoAI-Science'`、顶栏完整名称一致、userData 精确使用隔离测试目录。使用测试模型配置，未调用真实模型 API，也未操作安装在 /Applications 的应用。

打包、类型、构建、Electron 和打包启动日志及截图保留在 `/Users/liuyue/Documents/Codex/2026-10-26/ecoai-app-name/`。

## 发布边界

本次仅提交到本地 main；版本号、标签和 GitHub Release 附件未改变。现有已下载的 0.0.1 包不会因源代码修正自动改名，需要重新打包发布。Windows/Linux 仅统一了共享打包配置及脚本，未进行实际打包或真机运行验证。本次验证生成的是本地解包应用，没有生成 DMG、ZIP 或其他平台安装器。
