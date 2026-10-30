/**
 * 下载那一段（规格 U5 的前半）。**对着一台真的 http 服务器验**——
 * 假一个 `fetch` 出来的话，验的是我们自己写的替身，而流、进度、
 * 中断这三件恰恰都在真实现里。
 */
import { describe, expect, it, afterAll } from "vitest"
import http from "node:http"
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { 下载到 } from "../../src/update/下载.js"

const 包大小 = 200_000
const server = http.createServer((req, res) => {
  const u = new URL(req.url ?? "/", "http://x")
  if (u.pathname === "/slow") {
    // 分块慢慢吐，中断那条用例要有机会中断
    res.writeHead(200, { "content-length": String(包大小) })
    let 发了 = 0
    const 定时 = setInterval(() => {
      if (发了 >= 包大小) {
        clearInterval(定时)
        res.end()
        return
      }
      res.write(Buffer.alloc(10_000, 1))
      发了 += 10_000
    }, 20)
    req.on("close", () => clearInterval(定时))
    return
  }
  if (u.pathname === "/short") {
    res.writeHead(200).end(Buffer.alloc(10, 1))
    return
  }
  if (u.pathname === "/pkg") {
    res.writeHead(200, { "content-length": String(包大小) }).end(Buffer.alloc(包大小, 7))
    return
  }
  res.writeHead(500).end()
})
server.listen(0, "127.0.0.1")
const 根 = () => `http://127.0.0.1:${(server.address() as { port: number }).port}`
afterAll(() => server.close())

const 临时 = () => mkdtempSync(join(tmpdir(), "dawn-dl-"))

describe("下载到", () => {
  it("下得下来，落在指定目录，字节数对得上", async () => {
    const 目录 = 临时()
    const 进度: number[] = []
    const 路径 = await 下载到({
      资源: { name: "pkg.zip", size: 包大小, url: `${根()}/pkg` },
      目录,
      进度: (p) => 进度.push(p.已下),
      signal: new AbortController().signal,
    })
    expect(dirname(dirname(路径))).toBe(目录)
    expect(basename(路径)).toBe("pkg.zip")
    expect(readFileSync(路径).length).toBe(包大小)
    expect(进度.length).toBeGreaterThan(0)
    expect(进度.at(-1)).toBe(包大小)
  })

  it("大小与 Release 说的对不上就拒收，**并说清楚差多少**", async () => {
    const 目录 = 临时()
    await expect(
      下载到({
        资源: { name: "pkg.zip", size: 包大小, url: `${根()}/short` },
        目录,
        进度: () => {},
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/10 .*200000|200000.*10/)
    // 半截的东西不许留在盘上——下次启动看到它会以为已经下好了
    expect(existsSync(join(目录, "pkg.zip"))).toBe(false)
    expect(readdirSync(目录)).toEqual([])
  })

  it("能中断，而且中断之后不留半截文件", async () => {
    const 目录 = 临时()
    const 闸 = new AbortController()
    const p = 下载到({
      资源: { name: "pkg.zip", size: 包大小, url: `${根()}/slow` },
      目录,
      进度: (x) => {
        if (x.已下 > 0) 闸.abort()
      },
      signal: 闸.signal,
    })
    await expect(p).rejects.toThrow(/取消|中止/)
    expect(existsSync(join(目录, "pkg.zip"))).toBe(false)
    expect(readdirSync(目录)).toEqual([])
  })

  it("服务器回 500 时把状态码说出来", async () => {
    await expect(
      下载到({
        资源: { name: "pkg.zip", size: 1, url: `${根()}/boom` },
        目录: 临时(),
        进度: () => {},
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/500/)
  })
})

describe("每次下载的文件归属", () => {
  const 资源 = { name: "update.zip", size: 1024, url: "https://example.invalid/update.zip" }
  const 下 = (目录: string, 内容: number) => 下载到({
    资源, 目录, 进度: () => {}, signal: new AbortController().signal,
    fetch: async () => new Response(new Uint8Array(资源.size).fill(内容)),
  })

  it("同名资源的两次成功下载各自拥有文件路径与内容", async () => {
    const 目录 = 临时()
    const 第一个 = await 下(目录, 1)
    const 第二个 = await 下(目录, 2)
    expect(第一个).not.toBe(第二个)
    expect(readFileSync(第一个)).toEqual(Buffer.alloc(资源.size, 1))
    expect(readFileSync(第二个)).toEqual(Buffer.alloc(资源.size, 2))
  })

  it("旧下载取消后的清理不删除已经成功重试的同名包", async () => {
    const 目录 = 临时()
    const 已开始 = Promise.withResolvers<void>()
    const 闸 = new AbortController()
    const 旧下载 = 下载到({
      资源, 目录, signal: 闸.signal, 进度: () => 已开始.resolve(),
      fetch: async () => new Response(new ReadableStream<Uint8Array>({
        start(控) { 控.enqueue(new Uint8Array(100)) },
      })),
    })
    const 已取消 = expect(旧下载).rejects.toThrow(/取消|中止/)
    await 已开始.promise
    const 新包 = await 下(目录, 2)
    闸.abort()
    await 已取消
    expect(readFileSync(新包)).toEqual(Buffer.alloc(资源.size, 2))
  })

  it("一次失败不删除上次成功的同名包", async () => {
    const 目录 = 临时()
    const 已有包 = await 下(目录, 1)
    await expect(下载到({
      资源, 目录, 进度: () => {}, signal: new AbortController().signal,
      fetch: async () => new Response(new Uint8Array(10)),
    })).rejects.toThrow(/大小对不上/)
    expect(readFileSync(已有包)).toEqual(Buffer.alloc(资源.size, 1))
  })

  it.each(["../other.zip", "a/b.zip", "a\\b.zip", ".", "..", ""])("拒绝越出专属目录的资源文件名 %s", async (name) => {
    // 即使对旧实现跑红灯，越界目标也仍在本测试拥有的临时目录内。
    const 目录 = mkdtempSync(join(临时(), "attempt-"))
    let 取过 = false
    await expect(下载到({
      资源: { ...资源, name }, 目录, signal: new AbortController().signal, 进度: () => {},
      fetch: async () => { 取过 = true; return new Response(new Uint8Array(资源.size)) },
    })).rejects.toThrow(/文件名/)
    expect(取过).toBe(false)
    expect(readdirSync(目录)).toEqual([])
  })

  it("收完全部字节时取消也不返回成功或保留半截包", async () => {
    const 目录 = 临时()
    const 闸 = new AbortController()
    await expect(下载到({
      资源, 目录, signal: 闸.signal,
      进度: () => 闸.abort(),
      fetch: async () => new Response(new Uint8Array(资源.size)),
    })).rejects.toThrow(/取消|中止/)
    expect(readdirSync(目录)).toEqual([])
  })
})
