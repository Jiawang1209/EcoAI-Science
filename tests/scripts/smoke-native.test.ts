import { execFile } from "node:child_process"
import { mkdtempSync, readdirSync, rmSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { afterEach, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })))
function environment() {
  const dir = mkdtempSync(join(tmpdir(), "ecoai-smoke-test-"))
  dirs.push(dir)
  return { dir, env: { ...process.env, TMPDIR: dir, TMP: dir, TEMP: dir, DEEPSEEK_API_KEY: "", DAWN_SMOKE_BASE_URL: "", DAWN_SMOKE_MODEL: "" } }
}

it("runs the real NativeRuntime event chain with a local model and removes its temporary session", { timeout: 45_000 }, async () => {
  const { dir, env } = environment()
  const result = await execFileAsync(process.execPath, ["--import", "tsx", "scripts/smoke-native.ts", "--mock"], { env, timeout: 40_000 })
  expect(result.stdout).toContain("冒烟通过")
  expect(result.stdout).toContain("假模型已应答")
  expect(result.stdout).toMatch(/started.*output.*exited/s)
  expect(readdirSync(dir).filter(name => name.startsWith("ecoai-smoke-native-"))).toEqual([])
})

it("injects the requested key through the model credentials and cleans up after a rejected request", { timeout: 45_000 }, async () => {
  const { dir, env } = environment()
  const authorizations: (string | undefined)[] = []
  const server = createServer((request, response) => {
    authorizations.push(request.headers.authorization)
    response.writeHead(401, { "content-type": "application/json" })
    response.end(JSON.stringify({ error: { message: "smoke rejected", type: "authentication_error" } }))
  })
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("missing server port")
  try {
    await expect(execFileAsync(process.execPath, ["--import", "tsx", "scripts/smoke-native.ts"], {
      env: { ...env, DEEPSEEK_API_KEY: "local-smoke-key", DAWN_SMOKE_BASE_URL: `http://127.0.0.1:${address.port}/v1` }, timeout: 40_000,
    })).rejects.toMatchObject({ code: 1 })
    expect(authorizations).toEqual(["Bearer local-smoke-key"])
    expect(readdirSync(dir).filter(name => name.startsWith("ecoai-smoke-native-"))).toEqual([])
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
