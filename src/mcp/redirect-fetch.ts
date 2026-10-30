import type { FetchLike } from '@modelcontextprotocol/sdk/shared/transport.js'

const redirectStatuses = new Set([301, 302, 303, 307, 308])
const maxRedirects = 5

/**
 * MCP headers can contain arbitrary secrets, and request bodies can contain user
 * data. Native fetch only strips a few standard headers on an origin change.
 * Follow redirects ourselves so no request reaches a different origin at all.
 */
export const fetchMcpSameOrigin: FetchLike = async (input, init) => {
  let url = new URL(input)
  const origin = url.origin
  let options: RequestInit = { ...init, redirect: 'manual' }
  for (let redirects = 0; ; redirects++) {
    options.signal?.throwIfAborted()
    const response = await fetch(url, options)
    if (!redirectStatuses.has(response.status) || !response.headers.has('location')) return response
    // Release the redirect response before either following or rejecting it.
    await response.body?.cancel()
    const next = new URL(response.headers.get('location')!, url)
    if (next.origin !== origin) throw new Error('MCP 已阻止跨源 HTTP 重定向；请核实并直接配置目标服务器地址。')
    if (next.username || next.password) throw new Error('MCP 已阻止包含用户凭据的 HTTP 重定向。')
    if (redirects >= maxRedirects) throw new Error('MCP HTTP 重定向次数超过上限。')
    const method = (options.method ?? 'GET').toUpperCase()
    if (((response.status === 301 || response.status === 302) && method === 'POST') ||
        (response.status === 303 && method !== 'GET' && method !== 'HEAD')) {
      const headers = new Headers(options.headers)
      for (const name of ['content-encoding', 'content-language', 'content-location', 'content-type', 'content-length']) headers.delete(name)
      const { body: _body, ...withoutBody } = options
      options = { ...withoutBody, method: 'GET', headers }
    } else if (options.body instanceof ReadableStream) {
      // MCP uses JSON strings. Never attempt to replay a consumed custom stream.
      throw new Error('MCP 无法安全重定向流式请求正文；请直接配置目标服务器地址。')
    }
    url = next
  }
}
