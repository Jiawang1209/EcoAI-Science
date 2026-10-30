# EcoAI Science 0.0.5 项目代码与依赖审计

审计基线：`9dc1222fd59f4a66b0096f9b058489cea76d500c`，`main`。日期：2026-10-30（Asia/Shanghai）。

**最终验收日期：2026-10-31。已修复本次复现的凭证、文件回退、运行时收尾、更新并发、布局、脚本和依赖问题。最终完整入口 `npm run test:e2e` 退出码为 0。Linux CI 的代码调整仍需真实 runner 复验，不能据 macOS 结果宣称远端 CI 已通过。**

| 最终检查 | 结果 |
| --- | --- |
| 严格类型检查、完整构建 | 通过；类型检查包含 scripts 与根配置 |
| 完整单元/集成测试 | 553 文件全部通过；5820 通过、10 条环境条件跳过，124.32 秒 |
| 可选 Python/R 条件补测 | 4 文件，73 通过、3 条相反条件跳过，11.09 秒；覆盖默认轮的 10 个解释器条件跳过，相反条件已在默认轮通过 |
| 完整普通 Electron E2E | **899 通过、1 条原有设计取舍跳过**，共 900 条 / 227 文件，45.3 分钟；无失败 |
| 独立真实内核 E2E | **6/6 通过**，16.5 秒；包含 Python、R、解释器路径与 ACP 借用内核 |
| 严格视觉复验 | 14 场景重复两轮，28/28 通过；另有三轮 42 张逐像素一致的采集稳定性验证 |
| macOS arm64 最终隔离打包 | 通过；打包版 CLI 与 7 项真实应用自测全部通过 |
| 根项目、生产依赖、两个 spike 审计 | `npm audit` 均为 **0**；`npm ls --all` 通过 |
| 收尾保护独立复现 | 同 stat 与普通用户修改均保留；busy/排队/停止等待；实际存档错误记录 gap 并拒绝不安全回退 |

普通 E2E 的唯一跳过项为 `sidebar-collapse.spec.ts:55` 中此前明确放弃的“展开过程不被压”过渡态测试；本轮没有新增跳过、增加超时或放宽视觉容差。Windows/Linux 桌面、新版 Linux CI、真实商业模型账户和实际覆盖安装不属于本机已验证结果。

首次审计结论（以下问题记录保留修复前证据）：源码与独立安装副本均可通过项目默认类型检查和完整构建，独立副本的 macOS arm64 应用可以打包、启动并完成既有打包自测；但扩展到遗漏脚本的类型检查发现真实错误，另有依赖风险、更新并发问题、界面问题与测试维护问题。首次全量 Electron 执行在约 552 条时被后续修复请求中断，未完整结束。

用户随后授权修复全部发现。修复工作在 `codex/project-audit-fixes-20261030` 分支完成；业务代码、依赖与测试修复及最终完整验证均已完成，包含补查发现的 Native 收尾衔接问题。最终验收记录完成时尚未提交、推送、发布或替换已安装应用；用户随后授权提交并合并到本地 main，仍明确禁止推送。下文历史验证表保留首次审计及中间阶段证据，最终结论以上表为准。临时证据在 `/tmp/ecoai-audit-20261030/` 与 `/tmp/ecoai-fixes-final/`。

## 范围与方法

- 审查主项目 `package.json`、锁文件、TypeScript/Vite/Vitest/Playwright 配置、Electron 与 CLI 构建脚本、打包及 CI 配置；另审计两个 spike 子项目的锁文件。
- 使用项目严格 TypeScript 检查覆盖 `src`、`tests`、`spikes`、`e2e`；对 38 个受 Git 管理的 JavaScript/MJS/CJS 文件运行 `node --check`。
- 执行全量单元与集成测试，并启动普通 Electron E2E；真实内核组按项目约定另起测试进程。
- 手工追查启动、状态栏、会话菜单、分析路线文件预览、MCP HTTP/SSE 请求、内核连接、Bot 结果送达及退出路径。自动化覆盖不等于逐行人工证明全部源码正确。
- 本机原有 `node_modules` 是指向 `../dawn-science/node_modules` 的符号链接。额外用 `git archive HEAD` 建立无此链接的副本，从锁文件独立安装，再执行类型检查、构建、原生模块探针和打包应用自测。

## 首次审计确认的问题（修复前）

### P1 HTTP MCP 的跨 origin 重定向会转发自定义凭证和正文

位置：`src/mcp/request-fetch.ts:78`；`src/mcp/客户端.ts:277` 附近的 HTTP 与 SSE 传输装配。

触发条件：配置 HTTP/SSE MCP，并使用 `X-API-Key` 等自定义凭证请求头；MCP 服务返回指向另一 origin 的重定向。当前自定义 fetch 沿用默认的重定向行为，SSE 的 eventSource fetch 也直接使用默认 fetch。

复现：仅使用本机两个不同端口和虚构凭证。307 重定向后，另一端收到 `X-API-Key: FAKE_AUDIT_KEY`、`mcp-session-id: FAKE_AUDIT_SESSION` 和原 JSON-RPC 正文。标准 `Authorization` 头在这次跨 origin 请求中被运行时移除；不能把本次证据夸大成所有凭证头都会泄漏。没有发送真实密钥，也没有访问外部接收端。

这是与锁定的 MCP SDK 1.30.0 已公开问题相符的实际可达行为，stdio MCP 不受这一 HTTP 问题影响。见 [MCP SDK 官方安全公告](https://github.com/advisories/GHSA-6prh-2h8m-c8cw)。

建议：升级到包含修复的 SDK，并确保自定义 fetch 仍明确拒绝跨 origin 重定向；或者先在两条自定义 fetch 路径使用拒绝重定向策略。升级后必须复验取消、SSE 断线续传、并发请求与外部结果未知等现有契约。

### P1 回退会把元数据未变的后续用户修改当作未修改而覆盖

位置：`src/project/checkpoints.ts:86`、`:565` 附近的计划计算；`src/project/fs-facts.ts:79`。

文件版本身份只比较 inode、mtimeMs 和 size，没有内容身份。使用完全独立的临时文件可确定性复现：初始内容 BASE，Agent 一轮修改成 AGNT 并结束；用户再写入同长度的 USER，同时保留 Agent 结束时的 mtime；此时执行“回退这一轮”，工作文件变回 BASE，结果中 restored 包含该文件，keep 与 failed 都为空。

这说明“后来手动改过的不动”的保护在“同 inode、同大小、保留修改时间”的操作中不成立。特定复制/同步/恢复方式或时间精度受限的文件系统可能形成这种条件；本次探针通过显式保留时间戳复现，**没有证明普通编辑器保存必然触发，也没有证明这就是 Linux CI 那条失败的原因**。

用户的 USER 字节在本次复现中仍被保存到 `.dawn/trash/rewind-.../script.txt`，可以找回；因此问题是工作文件被错误回退和用户修改未被正确识别，不能表述为已证实不可恢复的数据丢失。

建议对回退相关版本和目标建立内容校验，并在无法确认当前内容是否为本轮版本时保留文件/明确报冲突；保留现有废纸篓和竞争窗口保护。仅增加一条“mtime 相同就当没变”的说明不足以满足当前的用户修改保护承诺。

### P2 smoke:native 命令使用过期的运行时接口，会直接报错

位置：`scripts/smoke-native.ts:34` 至 `:38`；`src/runtime/native.ts:1803`；`tsconfig.json:28`。

脚本把 `endpoint: { baseUrl, apiKey, model }` 传给 NativeRuntime.start，但当前 SessionSpec 已改用 `native: { provider, model }`。默认类型检查没有包含 scripts 目录，因此此错误一直没有被默认 typecheck 检出。

扩展检查 scripts 和所有根配置文件后，得到 TS2353：endpoint 不存在于 SessionSpec。使用独立副本和虚构的 `DEEPSEEK_API_KEY=FAKE_AUDIT_KEY` 运行项目公开命令 `npm run smoke:native`，退出码为 1，并立即报告“native 运行时需要 provider 与 model，会话 n1 未提供”。失败发生在 resolveModel 和网络请求之前，没有向真实模型发送测试调用。

建议按当前 provider/model 与凭证注入方式更新冒烟入口，并把仍受支持的开发脚本纳入类型检查。不能只通过类型断言绕过，因为这次错误已经在真实命令中复现。

### P2 Node 最低版本声明与实际依赖不一致

位置：`package.json:11`、README 源码安装要求，以及 `package-lock.json` 内各依赖的 `engines.node`。

项目声明 `node >=22`，但锁定的 pi 0.86.0 系列要求 `>=22.19.0`，jsdom 30.0.1 要求 `^22.22.2 || ^24.15.0 || >=26.0.0`，Vite/React 插件和 Electron 也要求较新的 Node 22 小版本。因此“任意 Node 22 都满足源码开发要求”不成立。

本次实际验证环境是 Node 22.23.0、npm 12.0.1，没有因此安装失败；未将不满足依赖 engines 的旧版 Node 实际运行失败作为已复现结论。建议分别明确应用/CLI 运行与开发测试的支持版本，并对齐文档、engines 与 CI。

### P2 分析路线内的 PDF 预览高度低于已有验收门槛

位置：`src/ui/styles.css:8885` 附近的路线纵向布局、`src/ui/styles.css:8977` 附近的文件预览布局。

`e2e/analysis-route-map.spec.ts:9` 在原工作区与独立安装副本中均稳定失败：预览 stage 高度为 **147.5859375 CSS px**，既有断言要求大于 180 px。截图中 PDF 已成功渲染，问题是路线概览、标题和底部状态占用高度后，图表预览被压缩，不能描述为 PDF 引擎崩溃或白屏。

建议在给定窗口高度下给预览保留最小可用空间，对路线概览采用受限高度与滚动；保留关闭/重开后的路线、焦点和草稿验证，不直接降低断言掩盖布局回归。

### P2 检查更新的并发状态会覆盖用户偏好和下载完成状态

位置：`src/update/检查.ts:58`、`:79`、`:103`；`src/update/服务.ts:98`；`src/ui/update-panel.tsx:237`。

两条不需要联网或更换安装包的确定性探针均可复现：

1. 开始检查更新，等待发布源回复期间关闭自动检查。偏好立即保存为 `auto:false`，但检查完成时又把开始请求前捕获的旧盘面写回，变成 `auto:true`；同一期间保存的 ignored 版本也会丢失。界面上的复选框在检查期间仍可操作，服务层没有序列化这两个操作。
2. 正在下载时点检查更新，状态被无条件改为 checking。如果下载在这期间完成，`下好了()` 因当前状态不是 downloading 直接返回，不记录 ready；检查结束后回到 available。探针得到 `downloading → checking → available`，ready 记录为 null，可能让用户重新下载已完成的包。

建议检查返回时只合并当前盘面中的 lastCheckedAt，使用最新偏好计算结果，并为检查、下载、完成回执建立明确的并发/代次规则；不能仅靠前端临时禁用某个按钮，因为 backend 操作也必须保持一致。

### P2 多条 E2E 仍使用旧界面选择器

已确认的例子：

| 测试 | 原因 | 独立核对 |
| --- | --- | --- |
| `e2e/boot.spec.ts:20` | 查找已不存在的 `.statusbar > span`，并假定旧的无模型提示 | 在临时副本改为检查实际缺少 API key 的按钮后通过；打包自测也证明能启动 |
| `e2e/bulk-delete.spec.ts:131` | 查找旧的“删除会话”直接按钮；现在通过“会话操作”菜单进入删除 | 临时副本只调整操作路径后，孤儿任务删除用例通过 |
| `e2e/header-version.spec.ts:10` | 查找 `.brand-version`；新版为 `.app-status-version`，DOM 层级也已调整 | 新版状态栏的既有两条 E2E（含窄窗版本位置）通过 |
| `e2e/i18n.spec.ts:151` 附近 | 模糊查找 Skills 同时匹配设置导航和底部 Skills 数量按钮，触发 strict mode | 临时副本只改为精确匹配后，逐屏英文检查通过 |
| `e2e/pick-workspace.spec.ts` 五条用例 | 仍把点击“工作目录”当作直接选择目录；当前先打开最近/默认目录菜单，还需要点“另选文件夹…” | 临时副本只补上菜单操作后，五条全部通过 |
| `e2e/palette.spec.ts:157` | 快捷键入口已移至顶栏，高度为 32 px，旧断言要求与侧栏 28 px 搜索按钮相同；kbd 也改为逐键渲染 | 临时副本对齐入口高度与组合键 aria-label 后，其余开关、焦点、命令面板和搜索路径通过 |

这类失败说明完整验收套件尚未跟随界面更新，不能据此断言对应功能坏了。`ci.yml` 当前只运行 node/ui Vitest 项目，未运行这套普通 E2E，因此现有 CI 无法自动阻止这类漂移。

### P2 默认 E2E 命令漏跑三条非内核组用例

位置：`package.json` 的 `test:e2e` / `test:e2e:only` 脚本。

第一段使用未限定分组的 `--grep-invert "内核会话|解释器路径"`，会按完整测试标题排除所有命中项。随后只补跑 `e2e/kernel-session.spec.ts`，于是下列三个其他文件中的用例不在默认全量命令覆盖范围：

- `e2e/attach.spec.ts:541`：“内置对话有上传图片，内核会话没有”。
- `e2e/kernels.spec.ts:15`：“设置里列出本机内核，且每一条都带解释器路径”。
- `e2e/setup-wizard.spec.ts:97`：“解释器路径保存失败在卡片内显示，未配置时仍可跳过”。

本次根据收集出的 905 条清单识别后另外补跑。建议按 spec 文件或显式 tag/project 隔离真实内核组，不依赖普通标题里的中文片段。

### P2 当前提交的 Linux CI 失败且测试进程没有完成

直接核对当前同一提交的 [CI run 40889966367](https://github.com/Jiawang1209/EcoAI-Science/actions/runs/40889966367)：macos-15 的默认类型检查和 node/ui 测试成功；ubuntu-22.04 的 node/ui 测试在 20 分钟上限被终止，最后约 12 分钟没有新的测试输出，日志没有完整汇总。更早还明确记录 `tests/project/checkpoints.test.ts` 的“废纸篓里有一份清单”断言失败。

现有证据足以判定 Linux 全量验证未通过，不能把“mac 本地能跑”或“包发出来了”当作它已通过；日志不足以确定挂起的根因，未把它归因为某个具体测试或库。

同时核对同一提交的 [package run 40889974221](https://github.com/Jiawang1209/EcoAI-Science/actions/runs/40889974221)：macOS、Windows、Linux x64、Linux arm64 的打包、packaged CLI 与对应应用自测步骤全部成功。这是 CI runner 上的构建/冒烟证据，和 Linux 完整测试的失败并不矛盾，也不替代各平台最终用户桌面验收。

### P3 正常外部 Agent 会话会记录不适用的 Bot 错误

位置：`src/workbench/backend.ts:752`、`:2170`、`:2228`、`:2732`；`src/bot/delivery.ts`。

正常 ACP 会话恢复或 idle 时会调用 BotDelivery，其 busy 判断调用仅适用于 native/API 的 `botRuntime`，于是日志出现“Bot Team 第一版只支持 native/API 主会话”。既有 ACP E2E 可以继续通过，错误被 catch；目前证据说明这是错误路由和日志噪声，没有证明 ACP 对话因此崩溃。

建议在发送恢复/idle 事件到 BotDelivery 前按运行时能力过滤，保留对真正 Bot 失败的诊断。

## 首次依赖审计（修复前）

根锁文件 `npm audit --json` 返回 **39 个受影响包条目：critical 4、high 13、moderate 15、low 7**。`--omit=dev` 返回 34 个条目：critical 4、high 10、moderate 13、low 7。这里按 npm 的受影响包计数，包含沿传递依赖传播的条目，**不是 39 个独立、已在本应用成功利用的漏洞**。

另外两个不随主应用发布的 spike 锁文件分别有 2 个和 9 个条目；不能直接与根锁文件相加成为独立漏洞总数。

应优先处理实际运行路径：

- **MCP SDK 1.30.0**：跨 origin 请求转发已由本机探针确认。其他服务端 OAuth/tasks/bearer 公告不能一概套在本应用的 stdio 服务端上。
- **Electron 43.3.0**：虽然位于 devDependencies，它实际构成发布应用运行时，不能因 `--omit=dev` 将其排除在发布风险之外。锁定版本命中安全公告；例如 [sandboxed preload 缓存问题](https://github.com/advisories/GHSA-qmv3-fv6v-rmhq) 的 43.x 修复从 43.5.0 开始，但本次 audit 还列出其他较晚修复的公告，升级时应覆盖全部适用条目并回归原生模块/打包。
- **simple-git 3.36.0 / argv-parser**：audit 标 critical，但 `src` 和构建脚本未发现 simple-git 导入；项目 Git 事实读取使用 `execFile('git', ...)`。优先确认是否应移除未使用依赖，不把该扫描等级直接解释成应用已存在可达命令执行漏洞。
- **DOMPurify、proxy-addr、Axios、undici、Zod 等传递链**：完整清单保存在审计 JSON；需要按实际调用方式和上游修复分组升级。
- **image-size 1.2.1**：隔离子进程确实能复现特制 JXL 数据导致尺寸解析不返回，并被 1.5 秒上限终止。但当前 pptxgenjs 4.0.1 的尺寸读取片段为未使用的注释代码；未证明 EcoAI 的现有 PPT 工具可达此死循环，故不列为“制作 PPT 一定会卡死”。见 [image-size 安全公告](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)。

部分 `npm audit` 的 fixAvailable 给出降级或跨主版本方案，例如把 pi-coding-agent、ExcelJS 或 nteract 降到旧版。因此不应直接执行 `npm audit fix --force`。

## 首次验证记录（修复前）

| 检查 | 当前结果 |
| --- | --- |
| 工作区类型检查 / 完整构建 | 通过 |
| 扩展类型检查，额外包含 scripts 与根配置 | 失败：`scripts/smoke-native.ts:38` 存在 TS2353 |
| `npm run smoke:native`，使用虚构 key | 失败，退出码 1；旧 endpoint 参数与当前运行时接口不匹配，未发起模型请求 |
| 38 个 JS/MJS/CJS 语法检查 | 通过 |
| `npm ls --all` | 无 missing/invalid/peer 问题；直接依赖安装版本与锁文件相同 |
| 独立副本 `npm ci` | 通过，1040 packages；原生模块安装脚本策略有警告 |
| 独立副本类型检查 / 完整构建 / 发布元数据校验 | 通过 |
| 独立副本 SQLite 查询、PTY 启动与回显、ZMQ socket 创建关闭 | 通过；安装脚本警告没有在本机转化为这些模块加载失败 |
| 全量 Vitest 首轮 | 551 文件；5751 通过、5 失败、11 跳过；失败集中在两个真实 R 内核集成文件 |
| 首轮失败的两个文件独立复跑 | 11 通过、1 跳过；原失败未再出现 |
| 全部真实内核集成测试，显式指定可用 Python | 10 文件，47 通过；包含 Python/R 执行、中断、变量、产物、隔离与心跳 |
| macOS arm64 独立副本打包 | 通过，ad-hoc 签名；没有进行 Developer ID 公证 |
| 打包版 CLI 与 7 项应用自测 | 通过；包含窗口/数据库、身份、内置资源、假模型回复、终端和解释器/内核列表 |
| 普通 Electron E2E | 首次执行目标 898 条，在约 552 条时中断；不能算全量通过 |
| 独立真实内核 E2E | 首轮 4 通过、2 因项目目录下无 Python 环境跳过；临时副本引用已有环境后补跑两条全部通过 |
| 默认脚本漏跑的 3 条普通 E2E | 3 条全部通过 |
| 当前提交的远端 CI | mac node/ui 成功；Linux node/ui 有断言失败并在 20 分钟被终止 |
| 当前提交的远端打包矩阵 | macOS、Windows、Linux x64/arm64 的打包及 CLI/应用自测全部成功 |

首轮 R 测试出现 HMAC 签名不匹配/超时；当时本机有另一套 DAWN 测试进程并行运行。隔离复跑全部通过，尚不能证明具体原因是端口竞争，也不能将首轮失败抹掉后宣称整轮 Vitest 全绿。首轮主题色 E2E 在 teardown 的 app.close 上超时，独立副本单跑通过，同样按不稳定结果记录。

Vite 报出大分片警告，主 UI chunk 约 1.60 MB、gzip 约 499 kB。这是启动/解析成本优化项，不是本次构建失败。

## 尚未验证的边界

本次没有在本机执行 Windows/Linux 最终用户桌面验收；已只读核对同一提交在这些平台 CI runner 上的打包与自测记录。没有验证真实商业模型账号、真实 SSH 服务器、真实微信/飞书账户、外部 ACP/CLI 认证，也没有实际执行应用自更新覆盖安装。测试使用的假服务与隔离目录不能替代上述验收。

通过编译、测试和自测不能保证所有输入、操作系统及长期运行场景永不报错；本报告以可复现证据和明确边界为准。

原始日志与临时副本：`/tmp/ecoai-audit-20261030/`。修复后的最终统计见本文开头的最终验收表。


## 修复记录

- MCP：两条自定义 HTTP/SSE fetch 共用同源重定向边界；跨 origin 在发送前拒绝，允许受限的同源重定向，并验证正文重放、取消与循环上限。
- 回退：内容使用 SHA-256、权限与文件身份确认；存档内容校验；旧版未知身份保守保留；用户后建目录不删除，冲突记录可跨重试和重开保留。批量内容读取改为异步，覆盖前保留同步的最终内容校验。
- 更新：检查请求合并，完成时合并最新偏好；下载状态按代次保护，取消后重试使用独占目录，旧请求只清理自己的文件。
- Bot：按运行时能力筛选结果送达，保留未送达 outbox，避免 ACP/内核会话进入 native Bot 路径。
- 工具与测试：修复 smoke:native 的 provider/model 和临时凭证注入，增加本机 mock 与错误清理回归；类型检查覆盖 scripts 与根配置，ES2024 类型库对齐支持的 Node。
- UI：路线 PDF 保留可用预览高度，矮窗口保留转录滚动区域；旧菜单、状态栏版本、快捷键、悬停和响应式布局测试与当前产品契约对齐，没有降低原有可用高度断言。
- E2E：普通组按 kernel-session.spec.ts 文件隔离，不再依赖标题片段；真实 Python E2E 支持 DAWN_TEST_PYTHON，以便显式运行已有隔离环境。
- CI：node/ui 拆成独立任务，保留原 20 分钟上限并保存 verbose/hanging-process 日志；用普通文件阻塞父目录的 ENOTDIR 夹具替代 Linux /proc 的 mkdirSync 夹具。当前 Mac 没有可用 Linux 容器守护进程，尚未在真实 Linux runner 验证修复，不能宣称远端 CI 已变绿。

### 依赖处理

主项目 node_modules 已由指向 DAWN 的符号链接替换为本项目独立安装。只移除本项目链接，没有更改 DAWN 的依赖目录。npm ci 成功，npm ls --all 无依赖树错误。

根项目与两个 spike 锁文件的 npm audit 均为 0；根项目生产依赖审计也为 0。移除无导入的 simple-git，更新 MCP SDK 1.32.2、Electron 43.8.4、Vite 8.3.5、Vitest 4.1.12、KaTeX 0.19.1 和显式构建依赖 esbuild 0.28.2。没有使用 npm audit fix --force。

传递依赖采用限定到调用方的 override：nteract/spawnteract/enchannel 与 ExcelJS 的 uuid 保留 CommonJS v4 API，统一到已修复的 11.x；PPTXGenJS 当前未执行其旧的 image-size 代码，替换为已修复的 2.x；undici 与 KaTeX 统一修复版本。已运行 MCP、Office、Bot 与检查点组合 186 条回归通过，仍以最终全量和打包验证为准。Node 源码开发支持范围与依赖统一为 ^22.22.2、^24.15.0 或 >=26。

日志：/tmp/ecoai-fixes-*.log、/tmp/ecoai-fixes-audit-*.json、/tmp/ecoai-fixes-final/。

### 修复阶段已完成的验证（最终界面复验另计）

| 检查 | 结果 |
| --- | --- |
| 扩展 npm run typecheck | 通过，包含 scripts 与全部根配置 |
| npm run build | 通过；仍有分片大小优化提示，最大主 UI 分片约 2.11 MB / gzip 658 kB |
| 38 个受 Git 管理的 JS/MJS/CJS | node --check 全部通过 |
| npm test，显式指定 DAWN_TEST_PYTHON | 553 文件全部通过；5817 通过、10 条环境条件跳过；117.86 秒 |
| 补测本机 Python/R 的 fake SSH 条件分支 | 4 文件，73 通过、3 条相反环境条件跳过；11.46 秒。原全量轮的 10 个条件跳过均位于这些解释器分支；相反条件的 3 条已在全量轮通过 |
| npm ls --all | 通过，无 missing/invalid/peer 依赖错误 |
| 根项目、生产依赖、两个 spike 的 npm audit | 均为 0 |
| 当前源码隔离副本 npm ci / npm run pack | 通过；macOS arm64，Electron 43.8.4；没有公证或安装替换 |
| 普通 E2E 收集 | 当时 899 条 / 227 文件；新增低窗口回归后最终为 900 条 |
| 真实内核 E2E 收集 | 6 条 / 1 文件；最终独立执行 6/6 通过 |

本轮单元与集成回归没有失败；HTMLCanvasElement.getContext 的 jsdom 提示不是测试失败。fake SSH 补测调用本机隔离进程，未连接真实 SSH 主机。

### 独立 spike 安装补查

两个 spike 都在隔离副本从各自锁文件 npm ci 成功，审计仍为 0。D 的 zeromq socket 创建/关闭及 messaging/channel/launch 模块加载通过。C 首次独立安装真实复现 spawn-helper 为 0644、pty.spawn 报 posix_spawnp failed；原因是 npm 12 阻止依赖 postinstall，而 spike 本身没有兜底入口。已在 C 的 postinstall 复用根 scripts/fix-node-pty.mjs，更新锁文件 hasInstallScript；再次全新 npm ci 后 PTY 子进程成功输出 SPIKE_PTY_OK、退出码 0。没有更改 npm 的安装脚本信任策略。证据见 spike-pty-red.log、spike-pty-green.log、spike-c-install-fixed.log。

### 完整 E2E 追加发现与修复

- 数学公式用例的排版、字体和亮色截图通过，失败发生在复制后立即读取剪贴板。trace 显示点击结束约 0.355ms 后就发起读取；稍后的失败快照已经显示“已复制”。已修复数学公式、文件路径、两类背景色的断言，先等待成功反馈，再轮询完整剪贴板值，未改变产品复制逻辑。
- 会话切换用例仍期待旧品牌文字 EcoAI，实际正确显示 EcoAI-Science。已对齐断言。
- 子 Agent 名册的全局按钮正则同时匹配设置导航和新增状态栏入口。已限定设置导航，保留 23/22 的实际计数和启停文件验证。
- 1920×1080 的主区/侧栏输入卡同高验收发现真实布局问题：主区一行，侧栏被后加的窄容器规则强制为两行，卡片高差 44px。已恢复 data-follow-main 对实际行数的跟随，并在容器 ≤440px 时安全分行，保留模型与发送空间。通过 1280/1920 同高、底边对齐，以及 1920 下 480/441/440/360/300/280px 实际拖动验收。
- 新增 1280×480 回归，测出侧栏头部与输入卡挤压转录区；已收紧短窗口留白，保留按钮与输入尺寸。两侧输入卡同高、底边对齐，转录区均 >48px。普通 E2E 因此由 899 增至 900 条。
- 上传流程在 1000×620 窗口下，预览实际只有约 58px。已约束临时目录显示高度，为预览保留原设计的 64px，不改写用户拖动偏好；完整上传/下载、源文件保留和矮窗预览回归通过。
- 长代码吸顶用例原准备步骤停在代码块末端，剩余空间不足以继续吸顶。现用真实向上滚轮退出跟随，确保代码块尚有足够空间，并验证滚动实际增加 120px 后标题和动作仍处于吸顶边缘；保持 2px 要求，没有修改产品 sticky CSS。

普通 E2E 首次完整执行：878 通过、20 失败、1 条历史设计取舍跳过，合计 899 条，用时 47.7 分钟。跳过项为 sidebar-collapse 的展开动画过渡态验收，代码已明确记录原有取舍，本轮没有新增跳过。20 个失败由上列 6 个功能/测试问题与 14 张视觉基线构成，仍须修复并执行最终完整轮。

视觉基线已逐张查看 expected/actual/diff（14 组，联系图 visual-review-1.png 至 4.png，索引 visual-review-index.json）。旧图明确显示 v0.0.2，当前正确版本为 v0.0.5；主要差异是此前已实现的全局状态栏、终端入口、输入卡与统计区域布局，未发现乱码、内容缺失或溢出。根据 CLAUDE.md 的纪律，将本次稳定化后的 actual 原样更新为 14 张 macOS 基线，保持原有 threshold: 0 与 maxDiffPixels: 100，未提高容差或屏蔽变化区域；修复完成后仍须独立视觉复验和最终整轮验证。

### 最终视觉采集与预验收

刷新旧版本图片后，暗色概览曾出现 573 个、主要为灰度 ±1 的不稳定像素。严格复验未通过时没有提高容差。最终仅在视觉夹具使用静态 --disable-skia-graphite 与 --disable-gpu-rasterization，仍启用硬件加速与 GPU 合成，保留毛玻璃透色；普通功能 E2E 使用默认图形路径。采集时明确断言各 GPU 状态，避免开关失效后错误宣称环境已固定。

完整 14 场景连续采集 3 轮共 42 张，对应图片均 0 像素差异；已逐张查看与原 GPU 图的对照和差异图，毛玻璃背景采样与原 GPU 保持一致。仅将这组稳定参考帧作为最终 14 张 macOS 基线。threshold: 0、maxDiffPixels: 100、原有遮罩均不变。严格比较重复两轮共 28/28 通过（1.2 分钟）。纯 CPU 采集因改变毛玻璃效果已弃用，未进入最终代码。

Native 边界补查前的完整 Vitest：553 文件全部通过，5817 通过、10 个可选解释器分支按默认环境跳过，164.47 秒；这些解释器条件已另用本机 Python/R 的 73 条补测覆盖。测试夹具更新后的类型检查与设计契约 103/103 通过。最终 macOS arm64 包重新构建、签名，packaged CLI 与 7 项真实应用自测全部通过，未替换已安装应用。

最后执行入口为 DAWN_TEST_PYTHON=<已安装的隔离 Python> npm run test:e2e：重新构建 → 普通 900 条 → 独立真实内核 6 条。最终结果为普通 899 通过、1 条原有跳过，内核 6/6 通过，入口退出码 0。

### 补查：Native 完成事件必须等待检查点收尾

在最终整轮已通过 428 条时，额外的运行时边界复查实际复现：Native 先放下 inFlight 并发出完成事件，再异步排队收尾；idle 订阅者紧接着改写文件，会被结尾快照记成 Agent 内容，随后回退覆盖。普通 mtime 修改与精确同 inode/size/mtime 两种真实 NativeRuntime + 本机假模型 + bash 探针均确认此问题。该轮主动中止于 428 通过、1 interrupted、471 未运行（19.3 分钟）；中断项不是新发现的测试失败。

已将检查点收尾纳入原有 finally/pending 链，在完成后才降低 inFlight、发送最终 turn_end/cost/idle。保留 SDK 每次模型响应 turn_end 的既有含义，未将它误改成整轮完成。三条运行时回归先红后绿；60 文件、639 条相关测试通过。独立复查确认：idle 后普通/同 stat 用户修改均保留；收尾未完成时继续 busy，waitForIdle、排队消息、stop/dispose 均等待；真实 EISDIR 存档失败会先出声、记 gap，再释放运行状态，回退拒绝执行并保留 USER。

基于此最新源码，完整单元测试 5820 通过、完整 E2E 共 905 通过与 1 条原有跳过、构建与隔离打包自测全部通过；没有使用前面中止轮冒充完成。

### 最终证据与工作区状态

最终日志位于 `/tmp/ecoai-fixes-final/`：`vitest-runtime-final.log`、`conditional-runtime-final.log`、`typecheck-runtime-final.log`、`build-runtime-final.log`、`e2e-runtime-final.log`、`pack-runtime-final.log`、`packaged-runtime-final.log` 与 `audit-finish-*.json`。视觉参考图及三轮像素结果在 `visual-gpu-composite-stability/reference-manifest.json`；严格双轮比对在 `visual-accepted.log`。

测试自动覆盖的四张 `artifacts/case-cards/`、`artifacts/research-guide/` PNG 已备份到临时证据目录并恢复 Git 原图；14 张经过逐图审查的 macOS 视觉基线作为有意修复保留。最终验收记录完成时，源分支未提交、未推送，原始 HEAD 未改变。根项目使用独立 node_modules，未改动 DAWN 项目的依赖目录、已安装应用或用户网络配置。

边界：旧检查点缺少可靠内容身份时保守保留文件；文件内容校验会增加 I/O，批量读取已改为异步。沿用原设计关于运行中写入、后台写手及不支持硬链接文件系统的竞争边界，不能把这些本机验证扩大为所有操作系统和所有并发写入下的形式化保证。
