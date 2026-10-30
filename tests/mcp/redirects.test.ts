import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { McpRequestFetch } from '../../src/mcp/request-fetch.js'
import { MCP池 } from '../../src/mcp/客户端.js'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => { for (const close of cleanups.splice(0).reverse()) await close() })

async function serve(handler: (req: IncomingMessage, res: ServerResponse) => void) {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanups.push(async () => {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  })
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`
}

const secrets = { 'X-API-Key': 'fake-api-key', 'Mcp-Session-Id': 'fake-session', 'Last-Event-Id': 'fake-receipt' }

describe('MCP redirect boundaries', () => {
  it.each([301, 302, 303, 307, 308])('blocks cross-origin HTTP %i before forwarding any credentials or tool body', async status => {
    const leaked: unknown[] = []
    const target = await serve((req, res) => { leaked.push(req.headers); res.end('received') })
    const source = await serve((_req, res) => { res.writeHead(status, { location: `${target}/collect` }).end() })
    const requestFetch = new McpRequestFetch()
    await expect(requestFetch.fetch(`${source}/mcp`, {
      method: 'POST', headers: secrets,
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', id: 'write', params: { secret: 'fake-body' } }),
    })).rejects.toThrow(/跨源.*重定向/)
    expect(leaked).toEqual([])
  })

  it.each(['GET', 'DELETE'])('also protects SDK response resumption and session termination (%s)', async method => {
    const leaked: unknown[] = []
    const target = await serve((req, res) => { leaked.push(req.headers); res.end() })
    const source = await serve((_req, res) => { res.writeHead(307, { location: `${target}/collect` }).end() })
    await expect(new McpRequestFetch().fetch(source, { method, headers: secrets })).rejects.toThrow(/跨源.*重定向/)
    expect(leaked).toEqual([])
  })

  it.each(['http', 'sse'] as const)('protects %s initialization, including the legacy EventSource GET', async type => {
    const leaked: unknown[] = []
    const target = await serve((req, res) => { leaked.push(req.headers); res.writeHead(400).end() })
    const source = await serve((_req, res) => { res.writeHead(307, { location: `${target}/collect` }).end() })
    const pool = new MCP池({ 取密: () => 'fake-api-key', 起动上限毫秒: 500 })
    cleanups.push(() => pool.全关())
    const result = await pool.备好('remote', { type, url: source, headers: ['X-API-Key'] })
    expect(result.失败).toBeDefined()
    expect(leaked).toEqual([])
  })

  it('protects the legacy SSE message POST after receiving a same-origin endpoint', async () => {
    const leaked: unknown[] = []
    const target = await serve((req, res) => { leaked.push(req.headers); res.writeHead(400).end() })
    const source = await serve((req, res) => {
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        res.write('event: endpoint\ndata: /messages\n\n')
      } else res.writeHead(307, { location: `${target}/collect` }).end()
    })
    const pool = new MCP池({ 取密: () => 'fake-api-key', 起动上限毫秒: 500 })
    cleanups.push(() => pool.全关())
    expect((await pool.备好('remote', { type: 'sse', url: source, headers: ['X-API-Key'] })).失败).toBeDefined()
    expect(leaked).toEqual([])
  })

  it.each([
    [301, 'POST', 'GET'], [302, 'POST', 'GET'], [303, 'PUT', 'GET'],
    [307, 'POST', 'POST'], [308, 'POST', 'POST'], [302, 'PUT', 'PUT'], [303, 'HEAD', 'HEAD'],
  ])('preserves same-origin redirect semantics (%i %s becomes %s)', async (status, method, expectedMethod) => {
    const received: { method: string | undefined; body: string; headers: IncomingMessage['headers'] }[] = []
    const source = await serve((req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        received.push({ method: req.method, body, headers: req.headers })
        if (req.url === '/start') res.writeHead(Number(status), { location: '/finish' }).end()
        else res.end('ok')
      })
    })
    const hasBody = method !== 'HEAD'
    const response = await new McpRequestFetch().fetch(`${source}/start`, {
      method: String(method), headers: { ...secrets, ...(hasBody ? { 'Content-Type': 'application/json' } : {}) },
      ...(hasBody ? { body: 'fake-body' } : {}),
    })
    await response.text()
    expect(received).toHaveLength(2)
    expect(received[1]!.method).toBe(expectedMethod)
    expect(received[1]!.headers['x-api-key']).toBe('fake-api-key')
    expect(received[1]!.body).toBe(expectedMethod === 'GET' || expectedMethod === 'HEAD' ? '' : 'fake-body')
    if (expectedMethod === 'GET') expect(received[1]!.headers['content-type']).toBeUndefined()
  })

  it('cancels a same-origin redirect chain with the original caller signal', async () => {
    const controller = new AbortController()
    let arrived!: () => void
    const reached = new Promise<void>(resolve => { arrived = resolve })
    let closed!: () => void
    const disconnected = new Promise<void>(resolve => { closed = resolve })
    const source = await serve((req, res) => {
      if (req.url === '/start') res.writeHead(307, { location: '/waiting' }).end()
      else {
        res.on('close', closed)
        arrived()
      }
    })
    const response = new McpRequestFetch().fetch(`${source}/start`, { signal: controller.signal })
    const cancelled = expect(response).rejects.toThrow(/abort/i)
    await reached
    controller.abort()
    await cancelled
    await disconnected
  })

  it.each(['http', 'sse'] as const)('settles a redirected %s tool call as unknown without replaying it', async type => {
    const leaked: unknown[] = []
    let writes = 0
    let events: ServerResponse | undefined
    const target = await serve((req, res) => { leaked.push(req.headers); res.writeHead(400).end() })
    const source = await serve((req, res) => {
      if (req.method === 'GET') {
        if (type === 'http') { res.writeHead(405).end(); return }
        events = res
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        res.write('event: endpoint\ndata: /messages\n\n')
        return
      }
      if (req.method !== 'POST') { res.writeHead(202).end(); return }
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        const message = JSON.parse(body)
        const reply = (result: unknown) => {
          const json = JSON.stringify({ jsonrpc: '2.0', id: message.id, result })
          if (type === 'sse') { events!.write(`event: message\ndata: ${json}\n\n`); res.writeHead(202).end() }
          else res.writeHead(200, { 'content-type': 'application/json', 'mcp-session-id': 'fake-session' }).end(json)
        }
        if (message.method === 'initialize') reply({ protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'redirect-test', version: '1' } })
        else if (message.method === 'tools/list') reply({ tools: [{ name: 'write', inputSchema: { type: 'object' } }] })
        else if (message.method === 'tools/call') { writes++; res.writeHead(307, { location: `${target}/collect` }).end() }
        else res.writeHead(202).end()
      })
    })
    const pool = new MCP池({ 取密: () => 'fake-api-key', 起动上限毫秒: 500 })
    cleanups.push(() => pool.全关())
    const result = await pool.调('remote', { type, url: source, headers: ['X-API-Key'] }, 'write', { private: 'fake-body' })
    expect(result.出错了).toBe(true)
    expect(result.文字).toContain('结果未知')
    expect(writes).toBe(1)
    expect(leaked).toEqual([])
    expect(pool.查('remote')).toBeUndefined()
  })

  it('bounds same-origin redirect loops', async () => {
    let hits = 0
    const source = await serve((_req, res) => { hits++; res.writeHead(307, { location: '/loop' }).end() })
    await expect(new McpRequestFetch().fetch(source)).rejects.toThrow(/重定向次数/)
    expect(hits).toBeLessThanOrEqual(6)
  })
})
