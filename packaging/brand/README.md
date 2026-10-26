# EcoAI 品牌资源

2026-10-26。用户提供原始 Logo，并要求去除右下角水印、细化图形及接入 EcoAI-Science。原图只归档，不参与构建。

| 文件 | 用途 |
|---|---|
| ecoai-original.png | 用户原图，原样保留 |
| ecoai-logo.png | 完整透明 Logo：三叶、金色弧线与 EcoAI 字样；用于 README 和品牌展示 |
| ecoai-mark.png | 透明三叶标识；用于 App 顶栏、欢迎页和主助手头像 |
| ../icon.png、../icon.svg | `npm run make-icon` 从三叶标识生成的 1024px 安装包图标；SVG 嵌入 PNG，并非矢量重绘 |
| ../tray-icon.png、../tray-icon.svg | 同一命令生成的 36px 黑色透明托盘模板图；macOS 按主题着色 |

两张透明母图通过内置 `image_gen` 编辑工具生成，没有调用 CLI 或单独的图像 API。保留原有三叶构图和绿色体系；完整图保留金色弧线及准确的 EcoAI 大小写。小图标省去字样与弧线，适应 32px 使用场景。PNG 均含实际 alpha 透明通道；不是矢量文件。

修改母图后，在仓库根目录执行 `npm run make-icon`，再执行构建。旧 `rp-mark.svg` 仅保留为历史源文件，当前构建不再引用。

## 完整 Logo 编辑提示词

```text
Use case: precise-object-edit. Asset type: final EcoAI ecology research brand logo, transparent PNG. Input image 1 is the EDIT TARGET, supplied by its owner. Remove the small grey lower-right Chinese watermark completely. Refine the existing logo rather than redesigning it. Preserve its identity and proportions: three elegantly tapered upright green leaves converging at one base, central leaf taller, layered dark forest green and emerald facets, subtle light-green midribs; the slender shallow metallic-gold horizon arc beneath and behind the leaves; exact dark forest-green wordmark "EcoAI" beneath (E c o A I, exact case). Keep the leaf contours and overall composition very close to the source. Clean up jagged or noisy edges, make curves smooth and intentional, harmonize green gradients with clear contrast, remove grain/texture, sharpen precise wordmark edges and optical letter spacing. Sophisticated restrained scientific/ecological brand; crisp vector-like finish, not a 3D mockup. Keep original emblem above wordmark arrangement and gold arc. Output one isolated full logo on genuinely transparent background, with modest even padding, high resolution. No added Science text, no additional marks, no watermark, no shadow, no white canvas, no checkerboard drawn into pixels.
```

## App 标识编辑提示词

```text
Use case: precise-object-edit. Asset type: EcoAI app symbol / small UI icon. Input image is EDIT TARGET. Extract and refine ONLY the three-leaf emblem from this logo for its companion app icon. Preserve the exact three-leaf shapes, arrangement, green layered facets, smooth subtle emerald/forest-green gradients and pale-green slim veins from the supplied logo. Central leaf is tallest, two shorter leaves to either side, all converge to one point below. Remove the EcoAI wordmark and the entire gold arc, with absolutely no text or gold elements remaining. Center the same recognizable leaf emblem on a SQUARE genuinely transparent canvas, with about 6 percent padding above and below and sufficient padding horizontally, do not stretch proportions. Smooth clean antialiased outlines with no fringe, no grain, no texture, no scattered opaque pixels; crisp vector-like edges. Slightly simplify very fine shading so silhouette is readable at 32 px. No new shapes, no letters, no background tile, no drop shadow, no watermark, no drawn checkerboard. This is a faithful icon adaptation of the user's approved composition, not a new logo design.
```
