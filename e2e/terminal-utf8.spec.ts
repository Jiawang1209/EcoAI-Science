import { test, expect } from './fixtures.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Reproduce Finder's missing locale, independently of the test runner's shell.
test.use({ dawnOptions: { env: { LANG: '', LC_ALL: '', LC_CTYPE: '', SHELL: '/bin/zsh' }, reply: '中文回复：生态数据检查完成。' } })
test.skip(process.platform !== 'darwin', 'The reported regression uses macOS zsh')

test('Chinese paths and editing remain readable, and a Unicode right prompt allows EcoAI mode', async ({ dawn }, info) => {
  const { page, workspace } = dawn
  await page.locator('.composer-card .attach-trigger').click()
  await page.getByRole('menuitem', { name: '终端面板', exact: true }).click()
  const screen = page.locator('.dock .xterm-screen')
  const input = page.locator('.dock .xterm-helper-textarea')
  await expect(screen).toContainText(/[$#%]/)
  const submit = async (text: string) => {
    await input.focus(); await page.keyboard.type(text); await page.keyboard.press('Enter')
  }
  await submit("PROMPT='%1~$ '; RPROMPT='130 ↵'; mkdir -p '中文目录'; cd '中文目录'")
  await expect(screen).toContainText('中文目录$')
  await input.focus(); await page.keyboard.type("printf '%s' '中文输入错'")
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Backspace')
  await expect(screen).toContainText("printf '%s' '中文输入'")
  await page.keyboard.press('End')
  await page.keyboard.type(' > proof.txt')
  await page.keyboard.press('Enter')
  await expect.poll(() => {
    try { return readFileSync(join(workspace, '中文目录', 'proof.txt'), 'utf8') } catch { return '' }
  }).toBe('中文输入')
  await submit('cat proof.txt; echo')
  await expect(screen).toContainText('中文输入')
  await expect(screen).not.toContainText(/�|\\M-|<00[0-9a-f]{2}>/i)
  await page.screenshot({ animations: 'disabled', caret: 'hide', path: info.outputPath('utf8-shell.png') })
  await input.focus(); await page.keyboard.press('Control+c')
  await expect(screen).toContainText('130 ↵')
  await page.getByRole('button', { name: 'EcoAI 模式', exact: true }).click()
  await expect(page.getByRole('button', { name: 'EcoAI 模式', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(screen).toContainText('Enter 发送')
  await submit('检查中文样方数据')
  await expect(screen).toContainText('中文回复：生态数据检查完成。')
  await expect(screen).not.toContainText(/�|\\M-|<00[0-9a-f]{2}>/i)
  const mode = await page.evaluate(async () => {
    const id = Object.keys(JSON.parse(sessionStorage.getItem('dawn.window.terminal-owner') || '{}'))[0]!
    return (await window.dawn!.invoke('getTerminalAgentMode', { terminalId: id }) as any).data
  })
  const transcript = await page.evaluate(async id => (await window.dawn!.invoke('subscribeSession', { sessionId: id }) as any).data, mode.sessionId)
  expect(transcript.items.some((x: any) => x.type === 'turn' && x.who === 'user' && x.text === '检查中文样方数据')).toBe(true)
  await expect.poll(async () => {
    const r = await page.evaluate(async id => (await window.dawn!.invoke('subscribeSession', { sessionId: id }) as any).data, mode.sessionId)
    return r.items.some((x: any) => x.type === 'turn' && x.who === 'agent' && x.final && x.text.includes('中文回复：生态数据检查完成。'))
  }).toBe(true)
  await page.screenshot({ animations: 'disabled', caret: 'hide', path: info.outputPath('utf8-agent.png') })
  await dawn.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(900, 740))
  await expect(screen).toContainText('中文回复：生态数据检查完成。')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ animations: 'disabled', caret: 'hide', path: info.outputPath('utf8-agent-narrow.png') })
  await page.getByRole('button', { name: 'Normal 模式', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Normal 模式', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(screen).toContainText('已退出 Agent，返回 Shell')
})

test('an idle Shell with a Unicode right prompt can launch EcoAI without a false busy warning', async ({ dawn }) => {
  const { page } = dawn
  await page.locator('.composer-card .attach-trigger').click()
  await page.getByRole('menuitem', { name: '终端面板', exact: true }).click()
  const screen = page.locator('.dock .xterm-screen')
  const input = page.locator('.dock .xterm-helper-textarea')
  await expect(screen).toContainText(/[$#%]/)
  await input.focus()
  await page.keyboard.type("PROMPT='user@host ~/work$ '; RPROMPT='130 ↵'")
  await page.keyboard.press('Enter')
  await page.keyboard.press('Control+c')
  await expect(screen).toContainText('130 ↵')
  const result = await page.evaluate(async () => {
    const terminalId = Object.keys(JSON.parse(sessionStorage.getItem('dawn.window.terminal-owner') || '{}'))[0]!
    return window.dawn!.invoke('setTerminalAgentMode', { terminalId, mode: 'dawn' })
  })
  expect(result.ok, JSON.stringify(result)).toBe(true)
  await expect(screen).toContainText('Enter 发送')
  await page.getByRole('button', { name: 'Normal 模式', exact: true }).click()
  await expect(screen).toContainText('已退出 Agent，返回 Shell')
})
