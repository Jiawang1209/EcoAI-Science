# EcoAI 品牌替换实施计划

**Goal:** 将 App 用户可见品牌统一为 EcoAI，重写生态学研究工作台 README 并加入真实主页截图。

**Architecture:** 替换展示层与发布元数据，保留既有数据和协议标识；终端新增 ecoai 命令别名。使用独立 codex/ecoai-brand 工作树，按用户授权在当前会话执行。

**Tech Stack:** Electron、TypeScript、React、Vitest、Playwright。

- [x] 清点显示文字、发布配置、终端入口、已有测试，执行 4 文件 28 项基线。
- [x] 替换中英文界面、通知与工具输出，更新安装包与更新源，保留数据路径与加密存储身份。
- [x] 提供 ecoai 命令并保留 dawn 别名，验证真实终端进入与退出。
- [x] 重写中文 README 并新增 README.en.md 英文版，核对现有功能和边界，加入统一 Logo、语言切换及实际 Electron 主页截图。
- [x] 执行相关测试、类型与构建，原生预览与主页截图检查。
- [x] 保存验证记录，核对配置、凭证与历史记录未丢失。
- [x] 用户提供 Logo 后，去水印与细化，保存完整透明版与三叶标识，替换界面、安装包及托盘资源，刷新 README 截图及 14 张视觉基线；19 项相关检查与 14 项无更新复验通过。

- [x] 按用户要求将全部已完成变更同步到 `/Users/liuyue/Desktop/Github_repos/EcoAI-Science` 主目录，以该目录启动预览并核对两版 README、新 Logo 和截图。
