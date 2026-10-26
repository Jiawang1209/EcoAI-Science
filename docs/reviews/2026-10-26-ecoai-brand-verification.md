# EcoAI 品牌与 README 验证

日期：2026-10-26，Asia/Shanghai。基线 `c7dc9c3b`。改动先在独立分支 `codex/ecoai-brand` 完成，现已按用户要求同步到实际项目主目录 `/Users/liuyue/Desktop/Github_repos/EcoAI-Science`，保留为 main 上的未提交变更。

## 本次交付

- App 左上角导航显示完整名称 EcoAI-Science；文档标题、欢迎页、关于页、托盘、通知、错误提示、中英文文案和终端显示名称统一为 EcoAI。
- 安装包文件名使用 EcoAI-Science，主页与默认更新源指向 EcoAI-Science 仓库。锁文件同步根版本 0.0.36；依赖图和版本未改变。
- 内置终端使用可执行的 `ecoai` 命令；保留 `dawn` 命令别名、协议字段、环境变量、数据库与现有工作区路径。
- 保留默认打包数据目录与显式测试/预览目录。显示更名在 ready 阶段完成，初始化时保留原加密存储身份。
- README 重写为面向生态学研究的产品介绍，写明 DAWN-Science 的来源与姐妹产品关系、功能、使用前提、优势和实际能力边界。
- README 首页图为实际构建上的 Electron 窗口截图，来自固定隔离预览，侧栏分组收起；不展示会话正文、项目名称、服务器地址或凭证，未运行真实模型研究任务。隔离测试的空主页截图另保留在 Electron 证据中。
- 用户已提供三叶 EcoAI Logo，并授权去水印、细化与替换。原图保留；新增完整透明 Logo 和叶片标识，接入顶栏、欢迎页、主助手头像、安装包与托盘图标，更新 README 及视觉基线。

## 验证结果

证据目录：`/Users/liuyue/Documents/Codex/2026-10-26/ecoai-brand/`。

| 验证 | 实际结果 |
|---|---|
| 初始相关基线 | 4 文件、28 项通过 |
| 全量 Vitest | 518 文件、5471 项通过、10 项原有跳过；`vitest-final.log`。此轮在新增身份保护模块之前完成，不将后加测试混计为同一整跑 |
| 相关品牌、终端与设计契约 | 6 文件、185 项通过；`related-final.log`，其中包含最初 4 项身份保护检查 |
| 最终身份与凭证回归 | 4 文件、33 项通过，包含最终 5 项身份保护测试；`identity-final.log` |
| 类型与构建 | `typecheck-final.log`、`build-identity-final.log` 成功；固定原生预览另执行完整构建 |
| 最终真实 Electron | 19/19，通过品牌布局、关于页、首次设置、语言切换、新旧命令、会话恢复、终端多行、中文表格、流式滚动及工具详情；`electron-final.log` |
| 远程助理既有回归 | 首轮全部 3 项通过，使用微信替身，未联系真实联系人；`electron-first.log` |
| 原生预览 | 使用固定 `launch-preview.sh` 启动本工作树；主页与关于页显示 EcoAI，1280/1280 无横向溢出，无凭证解密警告；`native-verification.json`、`native-home-final.png`、`native-about.png`。最终主页在关闭面板、布局稳定后采集 |
| 数据保留 | providers 配置及已存凭证的 2 个 SHA256 均未变化，历史项目/会话总数未变化；`profile-preservation.json` |
| 静态核对 | README 本地目标均存在，新旧 CLI 入口内容一致，依赖图不变，保留历史 RP 源文件；用户原图原样归档，`git diff --check` 无错误 |

## 发现与修正

1. 名称增长一字符后，终端输入提示符需要更宽的固定区。改为按实际可见宽度计算，并保留鼠标定位、光标和续行对齐检查。
2. 短品牌名同时出现在终端标题和提示符中。原“标题已滚走”断言改为识别完整标题 `EcoAI ·`，保留流式结果、滚动位置和标题边框检查；没有放宽滚动行为。
3. 导航品牌的可访问名改为“EcoAI 首页”，避免与“EcoAI 模式”子串碰撞。没有增加设计契约白名单。
4. 显式 `--user-data-dir` 必须优先，防止打包测试打开真实用户目录。新增检查先失败后通过；原生路径比较按 realpath 核对 macOS `/var` 与 `/private/var` 的同一目录。
5. 根据当前 Electron 43.3.0 的[加密存储初始化源码](https://github.com/electron/electron/blob/v43.3.0/shell/browser/electron_browser_main_parts.cc#L478)，macOS/Linux 会在 ready 前使用应用名称设置加密存储身份。保留此初始化身份，再改变用户可见名称；对应生命周期检查先失败后通过。

## 左上角名称修正

用户补充指定左上角显示 `EcoAI-Science`。已修正该导航文字并刷新固定 Electron 预览及 README 首页截图，保留原字号、图标尺寸与按钮间距。

- UI 构建成功；启动、品牌布局、版本栏及侧栏相关 9/9 Electron 检查通过，见 `header-build.log`、`header-e2e.log`。
- 首轮剩余留白断言因完整名称的字形宽度差异得到 7.414px，超出旧 4–6px 范围。改为 4–8px，并新增品牌至按钮 8px、按钮之间 4px 的明确检查；没有改动布局 CSS。
- 实际预览显示完整名称且保持单行，1280px 视口无横向溢出，见 `header-native-verification.json`、`ecoai-science-header.png`。README 截图已重新采集并目视核对。

## 用户 Logo 接入

- 使用内置 `image_gen` 工具编辑用户图像，去除右下角水印，细化三叶边缘、绿色渐变及 EcoAI 字形。输出完整透明 Logo 与适合小尺寸的三叶标识；完整图保留金色弧线和 EcoAI 字样。原图未覆盖。资源和准确提示词见 `packaging/brand/README.md`。
- App 顶栏、欢迎页和主助手头像使用三叶标识；README 添加完整 Logo，并重采真实 Electron 首页截图。`npm run make-icon` 从新标识生成 1024px 安装包图标和 36px 单色托盘模板。SVG 封装 PNG，并非矢量母图。
- 图标生成、类型检查、完整构建成功：`logo-icons.log`、`logo-typecheck.log`、`logo-build.log`。
- 品牌布局、侧栏、关于页及视觉基线更新共 19/19 通过：`logo-e2e-update.log`。目视检查亮暗主页、对话、设置栏及 14 图联系表后，不带更新参数重新验证视觉基线，14/14 通过：`logo-visual-verify.log`。未修改阈值或遮罩。
- 原生预览实际加载新标识，导航保留 EcoAI-Science；1280px 视口无横向溢出，无凭证解密警告：`logo-native-verification.json`、`ecoai-logo-header.png`。安装包图标和托盘 PNG 已目视检查；托盘模板依赖 macOS 自动着色。

## 中英文 README 同步

新增 `README.en.md`，默认 `README.md` 保留中文。两版均使用 280px 完整透明 Logo、EcoAI-Science 主标题、相互切换的语言链接和相同真实 App 首页截图，并提供完整 Logo、叶片标识、安装包图标及来源说明入口。产品定位、功能、安装前提、源码命令、能力边界、姐妹产品署名和许可证同步。

两版各 22 个本地链接/锚点核对通过，均有 13 项功能、12 个标题段落；Logo、截图引用一致，代码围栏完整，`git diff --check` 通过。证据：`readme-bilingual-check.json`。本轮仅更新文档。

## 主目录实际落地

此前改动只存在于独立工作树，未同步到用户日常打开的项目目录。已核对两目录同为 `c7dc9c3b` 且主目录原先干净，再应用包含二进制资源的完整补丁及新增文件；最初同步的 158 个已修改文件和 12 个新增文件逐字节一致。证据：`sync-to-project.json`、`sync-to-project.patch`。

中文 README、英文 README、完整 Logo、叶片标识、安装包图标和全部已授权 App 品牌变更现均存在于主目录。预览改为通过固定启动器显式启动该主目录，实际页面 URL 及图片 URL 均位于 `/Users/liuyue/Desktop/Github_repos/EcoAI-Science/dist/ui/`，顶栏显示 EcoAI-Science，图片加载成功，1280px 视口无横向溢出；主页截图重新保存到主目录。证据：`project-native-verification.json`。主目录的类型检查、完整构建及身份/凭证 28 项回归通过，相关 Electron 回归 19/19 通过（含 14 张视觉基线），见 `project-electron.log`。

## 当前边界

变更已同步到用户指定的实际项目主目录 `/Users/liuyue/Desktop/Github_repos/EcoAI-Science`；独立工作树仅保留之前的副本。品牌变更已由用户提交推送，随后发布独立版本 0.0.1；正式发布结果见 `2026-10-26-ecoai-0.0.1-release.md`。未替换本机安装版。未执行安装包升级、签名或 Windows/Linux 真机验收。现有历史文档、技术兼容标识和用户历史内容中的 DAWN 名称保留；新 Logo 已完成接入及当前 macOS 预览检查；未进行新安装包的签名或各平台实际安装验收。
