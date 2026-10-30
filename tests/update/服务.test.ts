/**
 * backend 认的那个接口（规格 U8）：**六个操作回同一个信封**。
 * 盯的是「`自动检查` 每次现读」——记一份在内存里，就会出现
 * 「明明在关于里关了、它却还在查」这种没法解释的画面。
 */
import { describe, expect, it } from "vitest"
import { 建更新服务 } from "../../src/update/服务.js"
import { 更新管家 } from "../../src/update/检查.js"
import type { 安装器 } from "../../src/update/服务.js"
import type { 发布一条 } from "../../src/update/发布源.js"
import type { 更新盘面 } from "../../src/update/状态.js"

const 起 = () => {
  let 盘: 更新盘面 = { auto: true }
  const 管家 = new 更新管家({
    当前版本: "0.0.2",
    源: { 查最新: async () => undefined },
    事实: { platform: "darwin", arch: "arm64", appPath: "/A/x.app", 可写: () => true },
    读状态: () => 盘,
    写状态: (下) => {
      盘 = 下
    },
    现在: () => 1,
  })
  return 建更新服务({ 管家, 读盘: () => 盘 })
}

describe("更新服务", () => {
  it("每个操作都回「完整状态 + 那个开关」", async () => {
    const 服务 = 起()
    expect(服务.状态()).toEqual({ 状态: { 阶段: "idle", 当前: "0.0.2" }, 自动检查: true })
    const r = await 服务.检查(true)
    expect(r.状态.阶段).toBe("latest")
    expect(r.自动检查).toBe(true)
  })
  it("关掉自动检查之后，回执里当场就是 false（不是下次启动才对）", () => {
    const 服务 = 起()
    expect(服务.设偏好({ auto: false }).自动检查).toBe(false)
    expect(服务.状态().自动检查).toBe(false)
  })
  it("这台机器上装不了时**说的是装不了**，不是「更新失败」", async () => {
    // 没打包 / 无头：下下来也没用。**这句话要能让人自己走下一步**（去发布页）
    await expect(起().下载()).rejects.toThrow(/装不了.*发布页/)
  })
})

describe("下载取消与重试的并发", () => {
  const 起下载 = async (换包: 安装器["换包"] = async () => {}) => {
    let 盘: 更新盘面 = { auto: true }
    const 下载们: Array<ReturnType<typeof Promise.withResolvers<string>> & { signal: AbortSignal; 进度: Parameters<安装器["下载"]>[1] }> = []
    const 发布: 发布一条 = {
      版本: "0.0.6", 页面: "https://example.invalid/release",
      资源: [{ name: "EcoAI-Science-0.0.6-mac-arm64.zip", size: 100, url: "https://example.invalid/update.zip" }],
    }
    const 管家 = new 更新管家({
      当前版本: "0.0.2", 源: { 查最新: async () => 发布 },
      事实: { platform: "darwin", arch: "arm64", appPath: "/A/x.app", 可写: () => true },
      读状态: () => 盘, 写状态: (下) => { 盘 = 下 },
    })
    const 推们: string[] = []
    const 服务 = 建更新服务({
      管家, 读盘: () => 盘,
      推: (r) => { 推们.push(r.状态.阶段) },
      安装器: {
        下载: (_资源, 进度, signal) => {
          const 待下载 = Promise.withResolvers<string>()
          下载们.push({ ...待下载, signal, 进度 })
          return 待下载.promise
        },
        换包, 重启: () => {},
      },
    })
    await 服务.检查(true)
    await 服务.下载()
    return { 服务, 下载们, 推们, 读盘: () => 盘 }
  }

  it("当前下载的真实错误仍然显示，重新检查后可以重试", async () => {
    const { 服务, 下载们 } = await 起下载()
    下载们[0]!.reject(new Error("连接超时"))
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(服务.状态().状态).toMatchObject({ 阶段: "failed", 原话: "连接超时", 失败于: "下载" })
    expect((await 服务.检查(true)).状态.阶段).toBe("available")
    expect((await 服务.下载()).状态.阶段).toBe("downloading")
    服务.取消()
  })

  it("换包期间检查和偏好修改保留待装包，重复安装仍然被挡住", async () => {
    const 待安装 = Promise.withResolvers<void>()
    const { 服务, 下载们 } = await 起下载(() => 待安装.promise)
    下载们[0]!.resolve("/tmp/update.zip")
    await new Promise<void>((resolve) => setImmediate(resolve))
    const 装 = 服务.装()
    expect((await 服务.检查(true)).状态).toMatchObject({ 阶段: "ready", 包路径: "/tmp/update.zip" })
    expect(服务.设偏好({ auto: false }).状态.阶段).toBe("ready")
    await expect(服务.装()).rejects.toThrow("正在装了")
    待安装.reject(new Error("包校验失败"))
    expect((await 装).状态).toMatchObject({ 阶段: "failed", 原话: "包校验失败", 失败于: "安装" })
    expect(服务.状态().自动检查).toBe(false)
  })

  it.each(["完成", "取消报错", "网络报错"])("取消后立刻可重试，旧下载%s不污染新下载", async (旧结果) => {
    const { 服务, 下载们, 推们, 读盘 } = await 起下载()
    expect(服务.取消().状态.阶段).toBe("available")
    expect(下载们[0]!.signal.aborted).toBe(true)
    await 服务.下载()
    下载们[1]!.进度({ 已下: 60, 共: 100 })
    const 推数 = 推们.length
    下载们[0]!.进度({ 已下: 90, 共: 100 })
    if (旧结果 === "完成") 下载们[0]!.resolve("/tmp/old.zip")
    else 下载们[0]!.reject(new Error(旧结果 === "取消报错" ? "已取消" : "网络错误"))
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(服务.状态().状态).toMatchObject({ 阶段: "downloading", 已下: 60 })
    expect(推们).toHaveLength(推数)
    expect(读盘().ready).toBeUndefined()

    下载们[1]!.resolve("/tmp/new.zip")
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(服务.状态().状态).toMatchObject({ 阶段: "ready", 包路径: "/tmp/new.zip" })
    expect(读盘().ready?.包路径).toBe("/tmp/new.zip")
  })
})
