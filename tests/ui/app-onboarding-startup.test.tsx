import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from '../../src/ui/App.js'
import { createClient } from '../../src/ui/client.js'
import { OPERATIONS, WORKBENCH_PROTOCOL_VERSION, type SessionSummary } from '../../src/protocol/index.js'
import { $credentialsLoaded, $providersLoaded, $activeSessionId, $dockOpen, $tempSessions, setActiveSessionId, setDockOpen, setCredentials } from '../../src/ui/state/index.js'
import { 记引导完成, 记跳过 } from '../../src/ui/setup-wizard.js'

vi.mock('../../src/ui/terminal.js', () => ({ TerminalPane: () => <div /> }))
beforeEach(() => { localStorage.clear(); 记跳过(false) })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
function harness() {
  const providers = deferred<unknown>(), credentials = deferred<unknown>()
  const calls: string[] = [], sessions: SessionSummary[] = []
  const client = createClient(async op => {
    calls.push(op)
    const data = op === 'getProviders' ? await providers.promise
      : op === 'listCredentials' ? await credentials.promise
      : op === 'getCapabilities' ? { workbenchProtocolVersion: WORKBENCH_PROTOCOL_VERSION, operations: Object.keys(OPERATIONS), entityTypes: [], maxPageSize: 200, readOnly: false }
      : op === 'getUpdateState' || op === 'checkUpdate' ? { 自动检查: false, 状态: { 阶段: 'idle', 当前: '0.0.5' } }
      : op === 'listKnownProviders' ? { providers: ['deepseek'], models: { deepseek: ['deepseek-flash'] } }
      : op === 'listBots' ? { bots: [] }
      : op === 'listMcpServers' ? { servers: [], problems: [] }
      : op === 'listPlugins' ? { plugins: [] }
      : op === 'listArchivedSessions' ? { sessions: [] }
      : op === 'subscribeSession' ? { sessionId: 'existing', kind: 'native', revision: 0, items: [], terminal: '', terminalTrimmed: false, state: 'alive' }
      : op === 'listTemporarySessions' || op === 'listSessions' ? sessions
      : op === 'getInterpreters' ? {}
      : []
    return { ok: true, workbenchProtocolVersion: WORKBENCH_PROTOCOL_VERSION, data, warnings: [] }
  }, () => () => {}, async () => null)
  return { client, calls, providers, credentials, sessions }
}
const empty = { agents: [], providers: [] }
const oldEmptyCopy = /还没有可用的 agent|配置里还没有可用的 agent|配置文件里没有 agent/

it('启动数据未返回时先显示四步引导，不把空名单当作没有 agent', async () => {
  const h = harness()
  const { container } = render(<App client={h.client} />)
  await waitFor(() => expect(h.calls).toContain('getProviders'))
  expect(container.textContent).not.toMatch(oldEmptyCopy)
  expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
  expect(screen.getByRole('list', { name: '设置进度' }).children).toHaveLength(4)
})

it.each(['providers', 'credentials'] as const)('两份启动数据均已到手才决定首屏，%s 先返回也不闪旧空态', async first => {
  const h = harness()
  const { container } = render(<App client={h.client} />)
  await waitFor(() => expect(h.calls).toContain('getProviders'))
  await act(async () => {
    if (first === 'providers') h.providers.resolve(empty)
    else h.credentials.resolve({ configured: [], encrypted: true })
  })
  expect(container.textContent).not.toMatch(oldEmptyCopy)
  expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
  await act(async () => {
    if (first === 'providers') h.credentials.resolve({ configured: [], encrypted: true })
    else h.providers.resolve(empty)
  })
  await waitFor(() => expect($providersLoaded.get() && $credentialsLoaded.get()).toBe(true))
  expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
  expect(screen.getByRole('list', { name: '设置进度' }).children).toHaveLength(4)
  expect(container.textContent).not.toMatch(oldEmptyCopy)
  fireEvent.click(screen.getByRole('button', { name: '先跳过' }))
  expect(screen.queryByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeNull()
  expect(container.textContent).not.toMatch(oldEmptyCopy)
  fireEvent.click(screen.getByRole('button', { name: '打开配置向导' }))
  expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
})

it('已配置的用户在慢启动后直接回到首页，不误进向导', async () => {
  const h = harness()
  const { container } = render(<App client={h.client} />)
  await waitFor(() => expect(h.calls).toContain('getProviders'))
  await act(async () => h.credentials.resolve({ configured: ['deepseek'], encrypted: true }))
  expect(container.textContent).not.toMatch(oldEmptyCopy)
  await act(async () => h.providers.resolve({ agents: [{ agentId: 'chat', kind: 'native', provider: 'deepseek', model: 'deepseek-flash' }], providers: [{ providerId: 'deepseek', models: ['deepseek-flash'] }] }))
  expect(screen.getByRole('heading', { name: '今天想分析什么？' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeNull()
})


it('从已有会话及终端面板重新打开向导，不被当前视图挡住，也不删除会话', async () => {
  记跳过(true)
  const h = harness()
  render(<App client={h.client} />)
  await act(async () => {
    h.providers.resolve({ agents: [{ agentId: 'chat', kind: 'native', provider: 'deepseek', model: 'deepseek-flash' }], providers: [{ providerId: 'deepseek', models: ['deepseek-flash'] }] })
    h.credentials.resolve({ configured: [], encrypted: true })
  })
  await waitFor(() => expect($providersLoaded.get() && $credentialsLoaded.get()).toBe(true))
  await act(async () => {
    h.sessions.push({ sessionId: 'existing', projectId: 'p1', agentId: 'chat', kind: 'native', state: 'alive', title: '已有会话', pinned: false, sortOrder: 0, createdAt: '2026-10-31T00:00:00Z' })
    $tempSessions.set([...h.sessions])
    setActiveSessionId('existing'); setDockOpen(true)
  })
  fireEvent.click(screen.getByRole('button', { name: /还没有填任何 API key/ }))
  expect($activeSessionId.get()).toBeUndefined()
  expect($dockOpen.get()).toBe(false)
  expect($tempSessions.get().some(s => s.sessionId === 'existing')).toBe(true)
  expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
})


it.each(['unlocked', 'unreadable'] as const)('曾完成引导的用户在凭证待核验时仍从第一步开始，核验结果为 %s', async result => {
  记引导完成()
  const h = harness()
  render(<App client={h.client} />)
  await act(async () => {
    h.providers.resolve({ agents: [{ agentId: 'chat', kind: 'native', provider: 'deepseek', model: 'deepseek-flash' }], providers: [{ providerId: 'deepseek', models: ['deepseek-flash'] }] })
    h.credentials.resolve({ configured: ['deepseek'], encrypted: true, verified: false })
  })
  expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: '今天想分析什么？' })).toBeNull()
  expect(screen.getByRole('list', { name: '设置进度' }).children).toHaveLength(4)
  await act(async () => setCredentials(result === 'unlocked'
    ? { configured: ['deepseek'], encrypted: true, verified: true }
    : { configured: [], encrypted: false, verified: true, broken: ['deepseek'] }))
  if (result === 'unlocked') {
    expect(screen.getByRole('heading', { name: '今天想分析什么？' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeNull()
  } else {
    expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByText(/上一版保存的 key 解不开了/)).toBeTruthy()
  }
})

it('曾完成引导但缺少凭证时从欢迎页开始，主动下一页才进入功能和 API Key 页', async () => {
  记引导完成()
  const h = harness()
  render(<App client={h.client} />)
  await act(async () => {
    h.providers.resolve(empty)
    h.credentials.resolve({ configured: [], encrypted: true, verified: true })
  })
  expect(screen.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '下一页' }))
  expect(screen.queryByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeNull()
  expect(screen.getByRole('heading', { name: '科研对话' })).toBeTruthy()
  expect(screen.queryByLabelText('API key')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '下一页' }))
  expect(screen.getByRole('button', { name: /^保存$/ })).toBeTruthy()
  expect(screen.getByLabelText('API key')).toBeTruthy()
})
