# 钥匙串验证期间的首次引导背景

用户冷启动截图确认：macOS 登录钥匙串密码框弹出时，后方还是普通工作台。该密码不是 API Key，系统授权由用户完成，不自动输入、允许、拒绝或更改钥匙串。

原因：CredentialStore 在 warm 前按存盘元数据返回 configured，同时明确标记 verified:false；现有界面只检查清单是否到手及 configured 是否非空，误把尚未解锁的存盘提示当作可用配置。只修复空清单启动闪现不足以覆盖该状态。

修复：没有主动跳过时，首帧就渲染现有四步引导；目录、凭证仍未返回或 verified:false 时保持引导作为系统密码框的背景。不把未核验的存盘提示显示为已配置可用。核验成功的已配置用户正常进入工作台，核验失败继续引导并显示原有解密问题。已有主动跳过、手动打开引导的锁存及保存 Key 后继续选择计算环境的行为不变。不更改凭证文件、加密方式或系统授权策略。

验证：原有 App 延迟读取用例按首帧引导要求更新，并补充已保存但未核验的加密凭证成功/失败两条回归；旧版本 5 条失败、2 条通过。Electron 使用真实 CredentialStore 与独立测试目录的虚构无效密文，确认 verified:false 时是四步引导，warm 后核验失败仍在引导。Playwright 默认 mock keychain，不访问真实密钥或系统密码框。继续复验完整 UI、类型检查、构建和原首次配置流程，通过后合并本地 main，不推送。

## 验证结果

- 全量 UI：187 文件、1790 项通过，36.49 秒；新增未核验加密凭证的成功/失败两条回归均通过。
- 类型检查、完整构建通过。
- 真实 Electron：4 文件、18/18 通过，44.6 秒；新增用例使用隔离用户目录和真实 CredentialStore，冷启动直接观测 configured:[deepseek]、verified:false，此时四步引导可见且工作台标题不在场；mock keychain 核验虚构密文失败后，仍显示引导及原有原因。已查看等待核验时的窗口截图。没有操作真实系统密码框或真实凭证。
- 日志：/tmp/ecoai-keychain-backdrop-red.log、green.log、ui.log、electron.log、final-typecheck.log、build.log（完整文件名前缀均为 ecoai-keychain-backdrop-）。
