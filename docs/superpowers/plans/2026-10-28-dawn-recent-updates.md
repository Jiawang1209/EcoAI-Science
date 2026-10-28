# DAWN Recent Updates Migration Plan

**Goal:** 将用户确认的三组新功能完整移入 EcoAI 独立分支。
**Architecture:** 以 DAWN 846e1c35..83f0bf91 有限路径差异为准，分离品牌和早期远程终端分叉，保留原业务守卫和错误反馈。
**Tech Stack:** TypeScript、React、Electron、SQLite、Vitest、Playwright、Python/R Jupyter。

- [x] 迁移 tests/ 与 e2e/ 差异；排除不存在的旧远程终端测试；先运行现有 delivery/service、shortcut-panel、协议和 App 回归，确认新增行为的失败。
- [x] 迁移 src/artifacts、协议/存储/内核/运行时/后端/Electron 接线；适配 wiring 的远程分叉上下文，保持当前源逻辑。
- [x] 迁移 Markdown、文件选择、默认报告与 skills/analysis-delivery 规范和共享 mock。
- [x] 迁移输入区、工作目录、状态栏、服务图标、侧栏和快捷键；保留素材许可，适配新增可见品牌文案。
- [x] typecheck、build；完整 UI 与 Node 回归，真实内核及交付验证；相关 Electron 与截图检查，不调整已有视觉基线来掩盖差异。
- [x] 按 requesting-code-review 做独立只读审查，修复实际问题，更新 README/用法/验收记录并提交新分支。
