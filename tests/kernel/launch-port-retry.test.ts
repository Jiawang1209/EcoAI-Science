import { beforeEach, expect, it, vi } from 'vitest'
import { launchKernelChannel } from '../../src/kernel/channel.js'

const state = vi.hoisted(() => ({ errors: [] as string[], attempts: [] as Array<{ closed: boolean; stderr: { emit: (event: string, data: string) => void }; sent: string[] }> }))
vi.mock('../../src/kernel/specs.js', () => ({
  argvForInterpreter: () => ['/fake-python'], diagnoseInterpreter: () => undefined,
  diagnoseLaunch: () => undefined, discoverKernelSpecs: () => ({ specs: [] }),
}))
vi.mock('spawnteract', () => ({ launchSpec: vi.fn(async () => {
  if (state.attempts.length) expect(state.attempts.at(-1)?.closed).toBe(true)
  const { EventEmitter } = await import('node:events')
  const stderr = Object.assign(new EventEmitter(), { setEncoding: () => {} })
  const index = state.attempts.length
  state.attempts.push({ closed: false, stderr, sent: [] })
  return { spawn: { pid: 100 + index, exitCode: 1, kill: vi.fn(), stderr }, config: { index } }
}) }))
vi.mock('@nteract/messaging', () => ({
  kernelInfoRequest: () => ({ header: { msg_id: 'handshake', msg_type: 'kernel_info_request' }, parent_header: {}, metadata: {}, content: {} }),
  executeRequest: () => ({ header: { msg_id: 'execution', msg_type: 'execute_request' }, parent_header: {}, metadata: {}, content: {} }),
}))
vi.mock('enchannel-zmq-backend', () => ({ createMainChannel: ({ index }: { index: number }) => {
  const attempt = state.attempts[index]!
  let observer: ((message: unknown) => void) | undefined
  return {
    next: (message: { header: { msg_id: string; msg_type: string } }) => {
      attempt.sent.push(message.header.msg_type)
      if (state.errors[index]) { attempt.stderr.emit('data', state.errors[index]!); return }
      for (const type of ['kernel_info_reply', 'status']) observer?.({ header: { msg_type: type, msg_id: type }, parent_header: { msg_id: message.header.msg_id }, metadata: {}, content: {} })
    },
    subscribe: (listener: (message: unknown) => void) => { observer = listener; return { unsubscribe: () => { observer = undefined } } },
    complete: () => { attempt.closed = true },
  }
} }))

beforeEach(() => { state.errors = []; state.attempts = [] })
const launch = () => launchKernelChannel({ interpreter: { path: '/fake-python', language: 'python' }, handshakeTimeoutMs: 10 })

it('端口绑定竞争失败的实例先关闭，再以新连接重启且不发送分析代码', async () => {
  state.errors = ['zmq.error.ZMQError: Address already in use (addr=tcp://127.0.0.1:9002)']
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const channel = await launch()
    expect(state.attempts).toHaveLength(2)
    expect(state.attempts[0]?.closed).toBe(true)
    expect(state.attempts.flatMap(x => x.sent)).not.toContain('execute_request')
    expect(warning).toHaveBeenCalled()
    await channel.close()
  } finally { warning.mockRestore() }
})
it('持续端口竞争最多启动三次，非端口错误立即失败', async () => {
  state.errors = Array(3).fill('Error in R_zmq_bind: Address already in use')
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await expect(launch()).rejects.toThrow(/3/)
    expect(state.attempts).toHaveLength(3)
    expect(state.attempts.every(x => x.closed)).toBe(true)
    state.errors = ['No module named ipykernel']; state.attempts = []
    await expect(launch()).rejects.toThrow()
    expect(state.attempts).toHaveLength(1)
  } finally { warning.mockRestore() }
})
