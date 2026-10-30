/**
 * 查更新这件事的全部判断（规格 U2）：节流、忽略、三种失败的原话。
 *
 * **用请求计数断言节流**，不用返回值——返回值一样时，「没发请求」与「发了请求但结果相同」
 * 是两件完全不同的事，而后者会在开发期一天里把匿名限额（60 次/小时）打爆。
 */
import { describe, expect, it, vi } from "vitest"
import { 更新管家 } from "../../src/update/检查.js"
import type { 发布源, 发布一条 } from "../../src/update/发布源.js"
import type { 更新盘面 } from "../../src/update/状态.js"
import type { 平台事实 } from "../../src/update/资源.js"

const 一条 = (版本: string): 发布一条 => ({
  版本,
  页面: `https://github.com/x/y/releases/tag/v${版本}`,
  发布于: "2026-09-06T00:00:00Z",
  资源: [
    { name: `EcoAI-Science-${版本}-mac-arm64.zip`, size: 223_317_849, url: "https://example.invalid/z" },
  ],
})

const 事实: 平台事实 = { platform: "darwin", arch: "arm64", appPath: "/A/EcoAI.app", 可写: () => true }

/** 记账的假发布源：**次数是判据** */
const 假源 = (回: () => Promise<发布一条 | undefined>) => {
  const 调用 = { 次: 0 }
  const 源: 发布源 = {
    查最新: async () => {
      调用.次 += 1
      return 回()
    },
  }
  return { 源, 调用 }
}

const 建 = (
  源: 发布源,
  存: Record<string, unknown> = {},
  现在 = 1_000_000_000_000,
) => {
  let 盘 = { auto: true, ...存 } as Record<string, unknown>
  return new 更新管家({
    当前版本: "0.0.2",
    源,
    事实,
    读状态: () => 盘 as never,
    写状态: (下一个) => {
      盘 = 下一个 as never
    },
    现在: () => 现在,
  })
}

describe("节流（规格 U2）", () => {
  it("距上次查不足 1 小时：一个请求都不发", async () => {
    const { 源, 调用 } = 假源(async () => 一条("0.0.3"))
    const 现在 = 1_000_000_000_000
    const 管家 = 建(源, { lastCheckedAt: 现在 - (3600_000 - 1) }, 现在)
    await 管家.检查({ 自动: true })
    expect(调用.次).toBe(0)
  })
  it.each([3600_000, 2 * 3600_000])("距上次成功检查 %i 毫秒允许自动检查", async (间隔) => {
    const { 源, 调用 } = 假源(async () => 一条("0.0.3"))
    const 现在 = 1_000_000_000_000
    const 管家 = 建(源, { lastCheckedAt: 现在 - 间隔 }, 现在)
    await 管家.检查({ 自动: true })
    expect(调用.次).toBe(1)
  })
  it("手动点「检查更新」无视节流", async () => {
    const { 源, 调用 } = 假源(async () => 一条("0.0.3"))
    const 现在 = 1_000_000_000_000
    const 管家 = 建(源, { lastCheckedAt: 现在 - 60_000 }, 现在)
    await 管家.检查({ 自动: false })
    expect(调用.次).toBe(1)
  })
  it("关掉「启动时自动检查」之后，自动那次一个字节都不发", async () => {
    const { 源, 调用 } = 假源(async () => 一条("0.0.3"))
    const 管家 = 建(源, { auto: false })
    await 管家.检查({ 自动: true })
    expect(调用.次).toBe(0)
    // 但人自己点的那次照发——关的是「自动」，不是「这个功能」
    await 管家.检查({ 自动: false })
    expect(调用.次).toBe(1)
  })
})

describe("结论", () => {
  it("有新版 → available，带上该下的那个资源", async () => {
    const { 源 } = 假源(async () => 一条("0.0.3"))
    const 管家 = 建(源)
    const s = await 管家.检查({ 自动: false })
    expect(s.阶段).toBe("available")
    expect(s.阶段 === "available" && s.版本).toBe("0.0.3")
    expect(s.阶段 === "available" && s.安装.能 && s.安装.资源.name).toContain("mac-arm64.zip")
  })
  it("线上还是 0.0.2 → latest", async () => {
    const { 源 } = 假源(async () => 一条("0.0.2"))
    expect((await 建(源).检查({ 自动: false })).阶段).toBe("latest")
  })
  it("一个 Release 都没有（GitHub 回 404）→ latest，不是错误", async () => {
    const { 源 } = 假源(async () => undefined)
    expect((await 建(源).检查({ 自动: false })).阶段).toBe("latest")
  })
  it("忽略了 0.0.3 → ignored；出现 0.0.4 照常提醒", async () => {
    const { 源 } = 假源(async () => 一条("0.0.3"))
    const 管家 = 建(源, { ignored: "0.0.3" })
    expect((await 管家.检查({ 自动: false })).阶段).toBe("ignored")

    const { 源: 源2 } = 假源(async () => 一条("0.0.4"))
    const 管家2 = 建(源2, { ignored: "0.0.3" })
    expect((await 管家2.检查({ 自动: false })).阶段).toBe("available")
  })
  it("装不了的平台照样报 available，但带着装不了的原因", async () => {
    const { 源 } = 假源(async () => 一条("0.0.3"))
    const 管家 = new 更新管家({
      当前版本: "0.0.2",
      源,
      事实: { platform: "linux", arch: "x64", 可写: () => true }, // 没有 APPIMAGE = deb
      读状态: () => ({ auto: true }) as never,
      写状态: () => {},
      现在: () => 1,
    })
    const s = await 管家.检查({ 自动: false })
    expect(s.阶段).toBe("available")
    expect(s.阶段 === "available" && s.安装.能).toBe(false)
    expect(s.阶段 === "available" && !s.安装.能 && s.安装.因为).toMatch(/root|dpkg/)
  })
})

describe("失败要带原话（规格 7.5）", () => {
  it("超时", async () => {
    const { 源 } = 假源(async () => {
      throw new Error("GitHub 没应：超时 10 秒")
    })
    const s = await 建(源).检查({ 自动: false })
    expect(s.阶段).toBe("failed")
    expect(s.阶段 === "failed" && s.原话).toContain("超时 10 秒")
  })
  it("失败之后 lastCheckedAt 不前移——否则一次超时会把接下来 1 小时全堵死", async () => {
    const { 源, 调用 } = 假源(async () => {
      throw new Error("GitHub 回了 403")
    })
    const 现在 = 1_000_000_000_000
    let 盘: Record<string, unknown> = { auto: true, lastCheckedAt: 现在 - 2 * 3600_000 }
    const 管家 = new 更新管家({
      当前版本: "0.0.2",
      源,
      事实,
      读状态: () => 盘 as never,
      写状态: (下) => {
        盘 = 下 as never
      },
      现在: () => 现在,
    })
    await 管家.检查({ 自动: true })
    expect(调用.次).toBe(1)
    expect(盘.lastCheckedAt).toBe(现在 - 2 * 3600_000)
  })
})

describe("设偏好", () => {
  it("「这一版不再提醒」记的是版本号，写进盘里", async () => {
    const { 源 } = 假源(async () => 一条("0.0.3"))
    const 管家 = 建(源)
    await 管家.检查({ 自动: false })
    const s = 管家.设偏好({ ignore: "0.0.3" })
    expect(s.阶段).toBe("ignored")
  })
})

describe("检查期间的并发操作", () => {
  it("保留检查期间改过的自动检查和忽略偏好，并用新偏好算结果", async () => {
    const 待发布 = Promise.withResolvers<发布一条 | undefined>()
    let 盘: 更新盘面 = { auto: true }
    const 管家 = new 更新管家({
      当前版本: "0.0.2",
      源: { 查最新: () => 待发布.promise },
      事实,
      读状态: () => 盘,
      写状态: (下) => { 盘 = 下 },
      现在: () => 123,
    })
    const 检查 = 管家.检查({ 自动: false })
    管家.设偏好({ auto: false, ignore: "v0.0.6" })
    待发布.resolve(一条("0.0.6"))

    expect((await 检查).阶段).toBe("ignored")
    expect(盘).toEqual({ auto: false, ignored: "v0.0.6", lastCheckedAt: 123 })
  })

  it("并发检查共用一个请求，后发调用不会另开请求覆盖结果", async () => {
    const 待发布 = Promise.withResolvers<发布一条 | undefined>()
    const { 源, 调用 } = 假源(() => 待发布.promise)
    const 管家 = 建(源)
    const 自动 = 管家.检查({ 自动: true })
    const 手动 = 管家.检查({ 自动: false })
    expect(调用.次).toBe(1)
    待发布.resolve(一条("0.0.6"))
    expect(await 自动).toEqual(await 手动)
    expect(管家.当前状态()).toMatchObject({ 阶段: "available", 版本: "0.0.6" })
  })

  it("共用请求失败后可重试，失败不覆盖期间改过的偏好", async () => {
    const 待发布 = Promise.withResolvers<发布一条 | undefined>()
    let 次数 = 0
    const 管家 = 建({ 查最新: () => ++次数 === 1 ? 待发布.promise : Promise.resolve(一条("0.0.6")) })
    const 第一次 = 管家.检查({ 自动: false })
    const 第二次 = 管家.检查({ 自动: false })
    管家.设偏好({ auto: false, ignore: "0.0.6" })
    待发布.reject(new Error("网络断开"))
    expect(await 第一次).toMatchObject({ 阶段: "failed", 原话: "网络断开", 失败于: "检查" })
    expect(await 第二次).toEqual(await 第一次)
    expect((await 管家.检查({ 自动: false })).阶段).toBe("ignored")
    expect(次数).toBe(2)
  })

  it("下载期间检查不联网、不丢掉进度，完成后保留可安装的包", async () => {
    const { 源, 调用 } = 假源(async () => 一条("0.0.6"))
    const 管家 = 建(源)
    await 管家.检查({ 自动: false })
    管家.开始下载(100)
    管家.下载进度(50, 100)
    const 检查 = 管家.检查({ 自动: false })
    expect(管家.当前状态()).toMatchObject({ 阶段: "downloading", 已下: 50 })
    管家.下好了("/tmp/update.zip")
    await 检查
    expect(管家.当前状态()).toMatchObject({ 阶段: "ready", 包路径: "/tmp/update.zip" })
    expect(调用.次).toBe(1)
  })

  it("已下好时检查不联网、不替换待装状态", async () => {
    const { 源, 调用 } = 假源(async () => 一条("0.0.6"))
    const 管家 = 建(源)
    await 管家.检查({ 自动: false })
    管家.开始下载(100)
    const 已下好 = 管家.下好了("/tmp/update.zip")
    expect(await 管家.检查({ 自动: false })).toEqual(已下好)
    expect(调用.次).toBe(1)
  })
})
