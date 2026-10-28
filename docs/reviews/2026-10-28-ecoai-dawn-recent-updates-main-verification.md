# EcoAI 最新功能迁移：本地 main 合并验收

2026-10-28，用户授权检查无问题后合并 main。待合并分支 `codex/dawn-recent-updates` 的实现提交为 `1513d3b6`，原本地 main 为 `f2c5dcec`。fetch 后 origin/main 仍为 `2a2523d0`；本地原有两个未推送提交完整保留。工作区无未提交改动，分支可快进。

## 本轮独立复核

重新检查整个待合并差异、成果副本漂移修正、数据库 v17→v18 加表、留存作用域与删除集合修订、固定字节交付、协议 8.36 和旧交付可选字段兼容。独立只读审查未发现阻断本地合并的 P1/P2，另运行 9 文件 165 项回归全部通过。本轮无需修改应用代码。

## 合并前新鲜验证

- typecheck、完整 Electron/CLI/UI 构建、git diff --check 通过；大 chunk 提示保留。
- 完整 UI：185 文件、1776 项通过（50.57 秒）。
- 完整 Node：345 文件、3818 项通过、10 项条件跳过（76.92 秒），maxWorkers=4。
- 真实内核集成：10 文件、47 项通过（36.85 秒），包含实际 Python/R、来源记录、声明输入、真实输出与固定副本字节。
- 本轮关键 Electron：12 文件、38 项全部通过（1.8 分钟）。覆盖成果留存、Markdown/项目文件选择、报告与真实独立交付验证、状态栏/图标/目录/侧栏/模型菜单/快捷键、消息几何、原启动向导、跨服务请求和中文终端。

三组 Vitest 合计 540 文件、5641 项通过、10 项条件跳过。Electron 在构建完成后运行，没有并发重建产物或放宽断言。

## 合并与主分支复验

执行 `git switch main` 和 `git merge --ff-only codex/dawn-recent-updates`，main 快进到 `1513d3b6`。合并结果与已验证功能分支的 Git 树完全一致。

合并后的 main 实际 checkout 再次 typecheck 通过；24 文件 285 项成果/交付/UI/协议/技能回归通过（4.93 秒）。五个相关 Electron 文件 14 项全部通过（47.0 秒），覆盖成果固定副本与真实内核环境、Markdown 和默认报告、状态栏、工作目录及同帧消息几何。测试后工作区清洁，随后只补本验收记录与开发历史。

## 证据与边界

本轮日志、独立审查日志及合并前后 Electron 现场位于 `/Users/liuyue/Documents/Codex/2026-10-28/ecoai-dawn-recent-updates/main-merge/`，此前完整迁移验收见 `2026-10-28-ecoai-dawn-recent-updates-verification.md`。

Python/R、文件、PTY 和独立解释器实际执行，模型使用确定性隔离夹具。未验证真实供应商鉴权、用户 SSH 服务器或 Windows/Linux 真机；工程测试不证明模型科学解读正确。原 JSDOM Canvas、大分块、页面加载 -3/调试器退出及非 native 场景 Bot 恢复提示仍保留在日志中，没有以修改超时或断言隐藏。

仅合并本地 main，未推送、发布、部署、替换安装版或打开真实用户资料库。保留功能分支供追溯，原其他 worktree 不作变更。
