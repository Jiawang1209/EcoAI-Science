# EcoAI 终端中文乱码与 Agent 启动检查

日期：2026-10-26，Asia/Shanghai。项目主目录 `/Users/liuyue/Desktop/Github_repos/EcoAI-Science`，检查基线 `97ab4d31`，发布版本 `0.0.1`。

## 结论

在 macOS 通过 Finder/launchd 启动、LANG / LC_CTYPE / LC_ALL 均缺失或为空的条件下，原实现可以稳定复现中文乱码；Unicode 右提示符还会导致光标位置计算异常，使空闲 Shell 被误判为不可进入 EcoAI Agent 模式。

这不是所有中文文本都会损坏。node-pty 已使用 UTF-8 流式解码，桌面 CLI 传输也采用 UTF-8；本次确认的问题在 Shell 的缺省 locale。没有修改终端字体、用户 shell 配置或系统语言设置。

## 修复前复现

- `tests/runtime/pty-locale.test.ts`：4 个真实 zsh 用例全部失败。中文路径及输入出现 `�`、`\M-`、`<00xx>` 转义。
- 相同 ASCII 左提示符与 `130 ↵` 右提示符，在无 locale 环境下，TerminalScreen 的 cursorPrefix 缺少 `$ `，因此不符合 launchCli 的空闲 Shell 条件。
- 中文目录 Electron 用例失败，不能显示 `中文目录$`。
- 独立的 ASCII 路径 / Unicode 右提示符 Electron 用例直接调用真实模式切换接口，得到 `invalid_request`：要求先回到空闲 Shell、按 Ctrl-C 再进入 EcoAI 模式。该用例没有发送任何模型请求。

证据：外部目录 `/Users/liuyue/Documents/Codex/2026-10-26/ecoai-terminal-utf8/` 下的 `pty-red.log`、`electron-red.log`、`agent-red.log`、`before-chinese-garbled.png`、`before-agent-blocked.png`。

## 修复

新增 `src/runtime/pty-environment.ts`，在父进程、CLI 隔离环境与会话环境合并后，为缺少所有字符 locale 的 Unix PTY 设置 UTF-8 默认值：macOS 使用 `en_US.UTF-8`，Linux 使用 `C.UTF-8`。

不修改父进程环境；保留显式 LANG / LC_CTYPE / LC_ALL 的优先级，包括明确设置的 C/POSIX；保留 LC_NUMERIC 等其他分类设置。Windows 分支不改变原有环境或代码页。没有放宽空闲 Shell、未提交输入或前台进程的启动守卫。

## 修复后验证

| 检查 | 结果 |
|---|---|
| locale 策略、真实 PTY、终端控制与桌面 CLI | 7 文件、59 项通过，`related-green.log` |
| 类型检查、完整构建 | 成功，`typecheck.log`、`build.log` |
| 桌面 CLI、中文多行/表格/流式交互及 UTF-8 复现回归 | 12/12 Electron 用例通过，`electron-green.log` |
| 新增 UTF-8 两项在加入截图及窄窗口检查后复跑 | 2/2 通过，`electron-proof.log` |
| 本地 main 最终复核 | 59 项相关测试、类型与完整构建、13 项 Electron 用例全部通过，`main-unit.log`、`main-typecheck.log`、`main-build.log`、`main-electron.log` |
| 中文内容真实写入文件 | `proof.txt` 精确等于“中文输入”；退格移除了多余的“错”字 |
| Agent 中文问答 | 用户提问“检查中文样方数据”原样持久化；测试模型的完整中文回复显示正常；退出后回到 Shell |
| 视觉 | 已查看普通窗口 Shell 和 900px 窄窗口 Agent 截图，中文、提示符及按钮正常，无横向页面溢出 |

视觉证据：`after-shell.png`、`after-agent.png`、`after-agent-narrow.png`，位于上述外部证据目录。

## 范围与状态

真实 PTY 与 Electron 复现/回归均在 macOS 上完成。Linux/Windows 只有环境策略单元覆盖，没有真机安装运行验收。文字通过自动化键盘输入，未切换或验证真实中文输入法的组合输入；Agent 问答使用测试模型，未调用真实模型 API。

全部终端测试使用独立夹具目录、数据库和 userData，没有操作或关闭用户正在使用的共享预览终端。测试日志中原有 NVM prefix 提示、页面加载 -3 和 Bot 恢复送达诊断未作为编码根因，也未据此修改其他模块。

用户确认修复后，按要求整理入 EcoAI 主目录的本地 `main`，由用户自行推送到 GitHub。本次保留 `0.0.1` 版本号和现有标签。

未推送、未发布，未替换安装版或更新现有 v0.0.1 Release；已经下载的 0.0.1 程序包仍使用修复前代码。
