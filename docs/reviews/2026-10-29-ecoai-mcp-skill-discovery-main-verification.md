# EcoAI-Science：MCP 与技能发现合并本地 main 验收

日期：2026-10-29（Asia/Shanghai）。用户明确授权“测试一下，没问题合并入 main”。本轮没有修改应用实现。

## 分支与整合

本次功能在独立分支 `codex/mcp-skill-discovery-updates` 开发并提交为 `95720ab8`。合并前本地 main 为 `e70e38f1`，工作区干净。刷新 origin 后确认远端 main `2a2523d0` 是本地主干祖先，没有待接入的新远端提交。

完成下列新一轮验证与只读复审后，切换 main，确认 origin/main 无需更新，再以 `git merge --ff-only codex/mcp-skill-discovery-updates` 快进。合并后 main 与功能分支都指向同一实现提交 `95720ab8`，没有冲突或重新编辑实现。功能分支保留。本验收记录及开发历史随后作为文档提交记录在 main。

## 本轮重新执行的合并前验证

| 检查 | 结果 |
|---|---|
| 类型检查、完整构建 | 全部通过，含 Electron bundle 解析检查 |
| 完整 Node | 354 文件，3919 项通过、10 项条件跳过 |
| 完整 UI | 186 文件，1783 项通过 |
| 串行内核 | 10 文件，46 项通过、1 项条件跳过 |
| 扩大 Electron 验证 | 8 文件、46 项覆盖通过，见下面补跑说明 |
| 新 macOS ARM64 包 | 新输出目录构建成功，复制到仓库外后系统 Node CLI 与 7 项应用自测通过 |
| 包签名完整性 | `codesign --verify --deep --strict` 通过（ad-hoc 签名） |
| 独立只读复审 | 没有实证 P1/P2 阻断；另外新跑 8 文件、46 项定向回归通过 |

完整 Vitest 合计 **550 文件、5748 项通过、11 项条件跳过**。Electron 覆盖实际 stdio MCP 配置/发现/调用与产物、技能搜索/预览/固定包安装/重启来源、旧技能管理、首启连接/协议、状态栏、成果留存、分析交付与 Markdown/项目文件选择。

Electron 首轮 45 项通过、1 项因本仓库默认 `.venv-kernel` 路径缺失而跳过；指定已存在的 `/Users/liuyue/Desktop/Github_repos/dawn-science/.venv-kernel/bin/python` 与 `/usr/local/bin/R` 后，单独补跑 Python/R 执行来源用例通过。没有安装或修改解释器环境，没有修改用例或放宽阈值。

新验收包构建目录为 `release/20261029-mcp-main-validation`，复制到 Documents 下的独立目录后验证包内 xterm 依赖归属、系统 Node CLI --help、窗口/数据库、EcoAI 名称/0.0.2/隔离配置、内置技能与子 agent、模拟模型往返、实际 PTY 输出、解释器探测和内核列表。它不是发布或安装版替换。

## 合并后验证

在 main 上重新运行类型检查、21 文件 315 项 MCP/技能/协议/打包定向回归和 2 文件 11 项 MCP/技能发现 Electron，全部通过。额外确认 main 的 src、scripts、生产依赖和 CI 文件与功能提交一致，并检查技能紧凑设置列的实际截图。

完整日志、复审日志、截图和仓库外验收包位于 `/Users/liuyue/Documents/Codex/2026-10-29/ecoai-mcp-skill-discovery/main-merge/`。本轮未使用真实供应商密钥、安装公开下载技能到正式根或修改正式用户资料库；模型使用确定性夹具。Windows/Linux 和 Intel Mac 原生包、任意第三方技能执行没有在本轮验收。构建分块、JSDOM Canvas 和 Electron 关闭时页面 -3 等提示保留在日志中，不作为运行通过的依据。

未推送、发布或替换已安装应用；保留功能分支供追溯。
