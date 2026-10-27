# EcoAI-Science 首次启动向导本地 main 合并验收

用户授权「再仔细检查测试一遍，确认没有问题后合并到 main」。2026-10-27 重新 fetch 后，本地 main 与 origin/main 均为 2a2523d0；功能分支 codex/first-launch-guide 为 130036fa，工作区清洁。

## 新一轮审查与测试

重新复核整个分支差异，重点检查语言切换的组件身份、旧跳过/完成状态、异步目录刷新与手动草稿、服务商地址及每模型协议、检测/保存/首聊一致性、已有连接模型保留、解释器保存等待/错误、焦点与卡片布局。独立第二轮只读审查未发现必须修复的 P1/P2，另运行 13 文件 202 项回归通过；没有修改应用代码。

合并前重新运行：

- 全 UI 组：178 文件，1699 项全部通过（53.81 秒）。
- workbench/runtime/config/protocol/store Node 组：124 文件，1482 项全部通过（35.97 秒）。
- typecheck、build、git diff --check 通过。
- Electron：7 文件 25 项全部通过（50.6 秒），覆盖四步向导、默认配置首次 native 对话、服务商切换、自定义端点、混合协议、解释器错误、跳过/重开、外链与双语。重新查看英文欢迎页和 API 页截图，未观察到裁切或品牌错误。

全 UI 日志有 jsdom Canvas getContext 未实现提示；构建仍有超过 500 kB chunk 提示。Electron 日志保留页面加载 -3/调试器退出提示及故障场景消息；所有测试完成其界面和 IPC 断言，未通过放宽断言处理这些提示。

## 本地合并与合并后复验

功能分支以 fast-forward 合并到本地 main，应用代码提交为 130036fa；合并结果与已验证功能分支的树完全一致。合并后 typecheck 通过；核心 5 文件 96 项回归通过（2.04 秒）；完整 setup-wizard Electron 11 项全部通过（21.4 秒）。随后仅增加本验收记录，不修改应用代码。

证据目录：`/Users/liuyue/Documents/Codex/2026-10-27/ecoai-first-launch-guide/recheck/` 和 `postmerge/`。测试使用独立配置与假服务，未验证真实供应商鉴权或 Windows/Linux 真机；该结论仅限本次检查和验证范围。未推送、发布或替换已安装应用。保留已合并的功能分支供追溯，其他 worktree 保持原状。
