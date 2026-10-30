/**
 * NativeRuntime 冒烟：started → output → exited。
 * npm run smoke:native             真实 DeepSeek 请求，需要 DEEPSEEK_API_KEY
 * npm run smoke:native -- --mock    本机假模型，不需要 key 或外网
 * DAWN_SMOKE_MODEL / DAWN_SMOKE_BASE_URL 可覆盖真实请求的模型与地址。
 */
import type { CredentialStore } from "@earendil-works/pi-ai"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { NativeRuntime } from "../src/runtime/native.js"

async function main(): Promise<void> {
  const mock = process.argv.includes("--mock")
  const key = mock ? "mock-key-not-a-real-secret" : process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error("缺少 DEEPSEEK_API_KEY —— 请在 .env 里配置，或使用 --mock 本机验证")
  const model = process.env.DAWN_SMOKE_MODEL || "deepseek-v4-flash"
  const provider = "deepseek"
  // 只在内存中注入本次端点的凭证，不读写用户钥匙串或 ~/.pi/auth.json。
  const credentials: CredentialStore = {
    read: async id => id === provider ? { type: "api_key", key } : undefined,
    list: async () => [{ providerId: provider, type: "api_key" }],
    modify: async () => { throw new Error("冒烟凭证只读") },
    delete: async () => { throw new Error("冒烟凭证只读") },
  }
  const dir = await mkdtemp(join(tmpdir(), "ecoai-smoke-native-"))
  let server: { url: string; close: () => Promise<void> } | undefined
  let runtime: NativeRuntime | undefined
  const sessionId = "smoke-native"
  const kinds: string[] = []
  let text = ""
  try {
    if (mock) {
      // @ts-expect-error -- 本机假模型是共用的 .mjs 测试脚本，无类型声明
      const { startMockInferenceServer } = await import("./mock-inference-server.mjs")
      server = await startMockInferenceServer()
    }
    const modelsPath = join(dir, "models.json")
    await writeFile(modelsPath, JSON.stringify({ providers: { [provider]: {
      baseUrl: server?.url ?? (process.env.DAWN_SMOKE_BASE_URL || "https://api.deepseek.com/v1"),
      api: "openai-completions",
      models: [{ id: model, name: model, api: "openai-completions", input: ["text"] }],
    } } }))
    // 会话与检查点都在临时目录，冒烟不向当前仓库写入工程状态。
    runtime = new NativeRuntime({ modelsPath, credentials, checkpoints: false, provenance: false })
    runtime.attach(sessionId, event => {
      kinds.push(event.kind)
      if (event.kind === "output") {
        text += event.data
        process.stdout.write(event.data)
      } else {
        console.log(`\n[event] ${JSON.stringify(event)}`)
      }
    })
    const handle = await runtime.start({
      sessionId, workspace: dir, sessionDir: join(dir, "session"), native: { provider, model },
    })
    console.log(`started pid=${handle.pid}  model=${model}\n--- 模型回答 ---`)
    runtime.write(sessionId, "用一句话说明你是谁")
    await runtime.waitForIdle(sessionId)
  } finally {
    // 失败时也释放运行时、监听端口和临时转录，且前一项清理失败不阻止后一项。
    try { await runtime?.stop(sessionId) }
    finally {
      try { await server?.close() }
      finally { await rm(dir, { recursive: true, force: true }) }
    }
  }
  const ok = ["started", "output", "exited"].every(kind => kinds.includes(kind)) && text.trim().length > 0
  console.log(`\n--- 判定 ---\n事件种类     : ${[...new Set(kinds)].join(", ")}\n收到正文长度 : ${text.trim().length}`)
  console.log(`${ok ? "✅" : "❌"} 冒烟${ok ? "通过" : "失败"}`)
  process.exitCode = ok ? 0 : 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
