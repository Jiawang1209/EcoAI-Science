# EcoAI-Science：MCP、GitHub 技能发现与 CLI 打包迁移验收

日期：2026-10-29（Asia/Shanghai）。EcoAI 基线 main 为 `e70e38f1`，分支 `codex/mcp-skill-discovery-updates`。对照 DAWN 从 `83f0bf91` 之后至 `735db8dd` 的 10 个提交，按最终差异迁入，未追随来源仓库正在进行的其他工作。

## 实现与适配

- MCP：文本、结构化结果、经校验的受限图片、资源链接与资源文本进入模型投影；原始返回不改写，过滤 App 专用与仅用户可见内容，错误保留到工具状态和续接历史。普通工具无默认 60 秒执行期限，初始化/发现/关闭仍有界；独立取消、配置与凭证失效、共享初始化代次与断流恢复按最终修正迁入。响应续传只取 GET，不自动重发已发送工具；取消或响应丢失报告结果未知。
- 技能：已安装/发现标签、Anthropic/OpenAI 声明目录搜索、公开 GitHub 链接解析、完整包清单与文本预览、固定提交安装、项目/全局根、冲突保留与离线来源。ZIP/路径/链接/预算检查、项目符号链接祖先检查及 pending install 跨标签刷新均接入。格式检查与运行未验证分别显示，不执行下载脚本或安装依赖。
- 构建：外部化已声明的 pi-tui，并在构建后解析检查 Electron bundle；现有 addon-unicode11 从开发依赖移到生产依赖，版本未变。新增包内 CLI 依赖归属及系统 Node 冒烟，接入原生 CI 打包流程。

EcoAI 品牌、0.0.2 版本、图标和现有增强的打包自测保留；协议 8.36 → 8.37，`.dawn-source.json` 等内部兼容名称不变。保留上次交付副本大小/SHA 修正、首启向导和原本地技能管理。没有迁入旧远程终端分叉。用法见 `docs/mcp.md`、`docs/skills.md`，README 中英文均已更新。

## 验证结果

| 验证 | 结果 |
|---|---|
| 先测旧实现 | 新增回归先迁入，旧实现 7 项按预期失败、39 项通过；涉及取消、富结果/错误、MCP 配置段与生产依赖 |
| 定向回归 | 21 文件，315 项通过 |
| 完整 Node | 354 文件，3919 项通过、10 项条件跳过 |
| 完整 UI | 186 文件，1783 项通过 |
| 串行内核 | 10 文件，46 项通过、1 项条件跳过 |
| 类型与构建 | typecheck、完整 build（含 Electron 产物解析检查）通过 |
| 真实 Electron | 技能发现、旧技能管理、首启向导，共 24 项通过 |
| 实际 GitHub 读取 | OpenAI 公共 pdf 技能固定到 `49f948faa9258a0c61caceaf225e179651397431`，4 文件清单、包摘要和格式校验成功；只预览后丢弃，未安装 |
| macOS ARM64 实际包 | 生成独立 EcoAI-Science.app，系统 Node CLI --help 和包内 xterm 依赖归属通过；7 项应用自测通过 |
| 仓库外复验 | 克隆到 Documents 独立路径后，上述 CLI 与 7 项应用自测再次通过；codesign --verify --deep --strict 通过 |
| 独立审查 | MCP 与技能安装两部分均无实证 P1/P2；另跑 34 项、52 项定向回归通过 |

完整 Vitest 合计 **550 文件、5748 项通过、11 项条件跳过**。包内自测涵盖窗口/数据库、名称/版本/隔离配置、技能与子 agent、确定性模型子进程往返、实际 PTY 输出、解释器发现、kernelspec/zeromq 列表。按先构建再 Electron 的顺序执行。人工查看完整设置和紧凑设置列截图，预览文件、安装入口及 EcoAI 品牌正常。

日志、首次失败、实际公共 GitHub 预览及截图保存在 `/Users/liuyue/Documents/Codex/2026-10-29/ecoai-mcp-skill-discovery/`。验收包位于该目录 `native/EcoAI-Science.app`，不是安装版或正式发布附件。完整预览图为 `skill-discovery-detail.png`，紧凑列为 `skill-discovery-compact.png`。

## 证据边界与交付状态

MCP 回归包括 SDK 配对传输、真实 stdio 子进程、状态化 loopback HTTP/SSE 和离线模型替身；超过 60 秒的等待使用虚拟时间验证。GitHub 读取实际联网，但安装测试使用固定包夹具和临时技能根。未验证任意第三方技能运行成功、真实模型供应商鉴权、Windows/Linux 原生包或 Intel Mac；跨平台仅接入配置与回归契约。日志保留 JSDOM Canvas、构建大分块、Electron 关闭时页面加载 -3 等既有提示，断言与阈值未为通过检查而放宽。

本轮在新分支提交，main 保持 `e70e38f1`；未推送、发布、修改正式技能目录/用户资料库或替换安装应用。历史保留的其他工作树未触碰。

后续状态：本功能已按用户授权重新测试并合并本地 main，详见[合并验收记录](2026-10-29-ecoai-mcp-skill-discovery-main-verification.md)。
