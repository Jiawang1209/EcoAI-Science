# Windows 图标和完整窗口名称修复

用户确认要修复 Windows 默认 Electron 图标，以及窗口顶部的 EcoAI 短名称。基线 main d616d4b7；独立工作树 windows-branding，分支 codex/windows-icon-full-name。

根因：win.signAndEditExecutable=false 提前跳过 PE 图标/版本资源编辑，且未显式提供 ICO；HTML title 和连接耗尽顶栏仍是 EcoAI。当前 mac 安装包 CFBundle 名称已为 EcoAI-Science。

修复沿用现有绿色三叶 PNG：生成 16/24/32/48/64/128/256 ICO，显式配置应用、安装器和卸载器；只禁用 Authenticode 签名，允许资源编辑。不更改已接受的 PNG、SVG、托盘、Logo 文字或历史存储/加密身份。窗口 title 和故障页顶栏统一 EcoAI-Science，版本保持 0.0.2。

借鉴 DAWN 21036f46 的资源校验方法，使用已有 resedit 1.7.2 并显式声明开发依赖。PE 图标核验比较主图标每帧内容，另校验主 EXE ProductName/FileDescription；新增正确/缺失/错误主图标/错误名称反例，接入 Windows CI。跨构建真实 Windows 应用、安装器和便携包并检查资源，跨构建包不作为 Windows 运行验收或发布包。使用真实 Electron 验证窗口标题和布局；打包 Mac 复验身份。

先改现有配置和窗口标题回归，证明旧实现失败，再实现修复。当前只提交修复分支，不推送/发布、修改安装应用或改 main。
