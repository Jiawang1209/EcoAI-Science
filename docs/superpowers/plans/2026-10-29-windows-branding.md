# Windows Branding Implementation Plan

**Goal:** 修复 Windows 默认图标并统一窗口标题为 EcoAI-Science。
**Architecture:** 保留既有品牌母图与兼容身份，仅修正资源生成/PE 写入和显示名称；CI 校验实际产物。
**Tech Stack:** Electron、electron-builder、resedit 1.7.2、Vitest、Playwright。

- [x] 增加配置回归，修改真实窗口标题断言；先观察旧实现失败。
- [x] 从现有 PNG 生成七尺寸 ICO；接入 make-icon、win/nsis 与版本一致的开发依赖。
- [x] 增加 PE 主图标和产品元数据检查器与正反测试，并接入原生 Windows CI。
- [x] 修改窗口 HTML title 和连接失败顶栏；保留用户资料、加密身份、应用版本和其他品牌资产。
- [x] 类型、构建、相关 Node/UI 和真实 Electron 验证；跨构建 Windows 三产物并核验资源，原生运行范围如实说明。
- [x] 独立复审、记录开发历史/验收证据并提交本分支；main 和远端保持不动。
