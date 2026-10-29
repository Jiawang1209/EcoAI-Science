# MCP and Skill Discovery Migration Plan

**Goal:** 将 DAWN 最新 MCP、在线技能发现与打包修正迁入 EcoAI 新分支。
**Architecture:** 使用 83f0bf91..735db8dd 最终差异，手动适配旧远程终端分叉、EcoAI 品牌和已经更新过的打包自测；复用既有配置/权限根和 pi loader。
**Tech Stack:** TypeScript、React、MCP SDK、Electron、esbuild、Vitest、Playwright。

- [x] 先移植 tests/e2e；运行现有 MCP 工具、配置写入和打包配置回归，确认旧实现失败。
- [x] 接入 src/mcp、工具/运行时取消、配置失效与后端状态；保持不重放已发出的调用。
- [x] 接入协议及技能发现、预览/安装/来源、授权根、UI 与 App 接线；保留旧本地管理和 EcoAI 文案。
- [x] 迁入构建检查、运行时 Unicode 依赖分类、包内 CLI 冒烟和 CI；保留现有增强的 EcoAI 打包自测。
- [x] 跑定向与完整 UI/Node 回归、类型/构建、隔离 Electron、实际包验证；独立审查并修复实证问题。
- [x] 更新用法/README/开发历史与验收记录，提交新分支，不合并 main 或推送。
