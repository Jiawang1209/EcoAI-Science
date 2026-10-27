# EcoAI-Science First Launch Guide Implementation Plan

**Goal:** 将 DAWN-Science 四步首次启动向导及后续修正移植到 EcoAI 新分支。

**Architecture:** 使用已审查的 ce2ec26c..846e1c35 有限路径补丁，单独适配向导品牌及协议版本，保留 EcoAI 分叉后的其他代码。

**Tech Stack:** React、TypeScript、Vitest、Electron、Playwright。

- [x] 迁移 tests/ui/setup-wizard.test.tsx、tests/ui/setup-endpoint.test.ts、tests/runtime/native.test.ts、tests/workbench/setup-model.test.ts、e2e/setup-wizard.spec.ts，并将新增可见品牌改为 EcoAI-Science；运行组件测试确认旧向导缺少四步交互。
- [x] 迁移 src/ui/setup-wizard.tsx、setup-endpoint.ts、App.tsx、Settings.tsx、styles.css、i18n/en.ts；保留内部存储键，适配欢迎页 EcoAI-Science 标题和翻译。
- [x] 迁移 src/runtime/native.ts、src/electron/wiring.ts、src/workbench/backend.ts、src/protocol/operations.ts，添加目录元数据与显式模型优先选择；协议版本及版本断言同步到 8.35。
- [x] 运行 npm run typecheck、相关 Vitest 回归、npm run build；执行 setup-wizard 等相关 Electron 回归，保存截图并视觉检查。
- [x] 只读复核差异，更新 README 双语介绍和本分支验收记录；保持在新分支，不合并、推送或发布。
