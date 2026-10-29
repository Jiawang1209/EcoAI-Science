# EcoAI-Science：迁移 GitHub macOS 工作流至 macos-15

日期：2026-10-29。基线 main `a2dc5d6c`（用户已发布 v0.0.3），修复分支 `codex/macos15-workflows`，复用当前干净的托管工作树。用户授权本地修改、验证和合并 main；推送、手动触发 GitHub 构建及发布由用户执行。

## 现象与修复

EcoAI run `40846386067` 的 macos-14 job `123354785051` 被取消，没有启动任何构建步骤。实时 check-run annotation 为“多次尝试仍未取得 hosted runner”，并多次提示 macOS ARM64 容量限制。这证明本次直接失败是 runner 分配，不是应用编译或打包错误。Windows 和两个 Linux job 已成功，v0.0.3 Release 已发布但明确缺少 macOS 四份附件。

GitHub 官方已公告 macos-14 从 2026-07-06 开始弃用，于 2026-11-02 退役：https://github.com/actions/runner-images/issues/13518 。本次将 `.github/workflows/ci.yml` 的测试矩阵和 `.github/workflows/release.yml` 的 Mac 打包矩阵同步改为 macos-15。仅两行 runner 标签发生功能变化，其他系统、架构、打包命令、发布策略和自测保持原样；迁移不保证消除整个 ARM64 runner 池的排队。

## 本地验证

- YAML 解析及结构比较通过：相对基线仅 CI matrix.os[0] 和打包 matrix.include[0].os 改为 macos-15，其余完整工作流对象相等，无 macos-14 残留。
- 类型及完整 Electron/CLI/UI 构建通过。
- 按现有 Mac 打包命令实际生成 ARM64 / x64 各一份 DMG、ZIP，共四份；全部保存在工作树 `release/20261029-macos15-validation/`，日志及 SHA 清单保存到 `/Users/liuyue/Documents/Codex/2026-10-29/ecoai-macos15-workflows/`。
- ARM64 应用通过包内系统 Node CLI 与 7 项应用自测，覆盖窗口/完整身份/0.0.3/隔离配置、技能和子 agent、模型替身往返、真实 PTY、解释器探测和内核列表。Intel 包已构建，本轮未运行。
- 独立只读复审确认仅两行 OS 选择变化，无实证 P1/P2；差异检查通过。

本地宿主为 macOS 26.3.1 arm64，因此上述结果不能称为 GitHub macos-15 runner 验证。本轮没有推送、触发远端工作流、上传附件或创建新标签/Release；应用版本保持 0.0.3。

## 用户从 main 验证 GitHub 打包

修复经本地检查后合入主仓库 main，用户在主仓库执行：

```bash
git push origin main
gh workflow run release.yml --repo Jiawang1209/EcoAI-Science --ref main
```

在 Actions 检查由 workflow_dispatch 触发、分支为 main 的 package 任务，确认 macos-15 进入真实构建与包自测，并检查四份 Mac 附件。当前配置下手动 main 构建只生成 Actions artifacts，release job 按条件跳过；正式 Release 仍由版本标签触发。仅推送 main 会触发 ci，不会自动运行 package，所以上面第二条命令是必需的。

旧 v0.0.3 Tag 仍固定旧提交及旧 workflow，重跑旧 run 不会采用 main 的新 runner 标签。后续正式发布需单独决定版本；本轮不移动旧标签，也不把本地包上传为 GitHub 发布附件。
