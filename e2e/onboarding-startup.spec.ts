import { test, expect } from './fixtures.js'

test.use({ dawnOptions: { showSetup: true, providersYaml: 'agents: {}\n' } })
test('未配置启动不闪旧 agent 空态，直接进入四步向导，跳过后可重新打开', async ({ dawn }, info) => {
  const { page } = dawn
  await page.addInitScript(() => {
    const observed: string[] = []
    Object.assign(window, { startupEmptyStates: observed })
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        const text = node.textContent ?? ''
        if (/还没有可用的 agent|配置文件里没有 agent/.test(text)) observed.push(text)
      }
    }).observe(document, { subtree: true, childList: true })
  })
  await page.reload()
  const wizard = page.locator('.setup-wizard')
  await expect(wizard.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeVisible()
  await expect(wizard.getByRole('list', { name: '设置进度' }).locator('li')).toHaveCount(4)
  expect(await page.evaluate(() => Reflect.get(window, 'startupEmptyStates'))).toEqual([])
  await page.screenshot({ path: info.outputPath('unconfigured-welcome.png'), animations: 'disabled' })
  await wizard.getByRole('button', { name: '先跳过', exact: true }).click()
  await expect(wizard).toHaveCount(0)
  await expect(page.locator('.app-shell')).not.toContainText('还没有可用的 agent')
  await expect(page.getByRole('button', { name: '打开配置向导', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '打开配置向导', exact: true }).click()
  await expect(wizard.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeVisible()
})

test.describe('已有加密凭证的冷启动', () => {
  test.use({ dawnOptions: { showSetup: true } })
  test('钥匙串尚未核验时背景为四步向导，解不开后仍留在向导说明原因', async ({ dawn }, info) => {
    const { mkdirSync, writeFileSync, realpathSync } = await import('node:fs')
    const { join } = await import('node:path')
    const profile = join(dawn.dir, 'electron-user-data')
    mkdirSync(profile, { recursive: true })
    // Only seed this test's isolated profile. Playwright's Electron loader uses
    // --use-mock-keychain; the synthetic ciphertext never accesses real secrets.
    expect(realpathSync(await dawn.app.evaluate(({ app }) => app.getPath('userData')))).toBe(realpathSync(profile))
    writeFileSync(join(profile, 'credentials.json'), JSON.stringify({
      encrypted: true, entries: { deepseek: Buffer.from('SYNTHETIC_INVALID_CIPHERTEXT').toString('base64') },
    }), { mode: 0o600 })
    const page = await dawn.重开()
    const credentials = () => page.evaluate(async () => {
      const w = window as unknown as { dawn: { invoke: (operation: string, request: unknown) => Promise<{ data?: { configured: string[]; verified?: boolean; broken?: string[] } }> } }
      return (await w.dawn.invoke('listCredentials', {})).data
    })
    expect(await credentials()).toMatchObject({ configured: ['deepseek'], verified: false })
    const wizard = page.locator('.setup-wizard')
    await expect(wizard.getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeVisible()
    await expect(wizard.getByRole('list', { name: '设置进度' }).locator('li')).toHaveCount(4)
    await expect(page.getByRole('heading', { name: '今天想分析什么？' })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath('pending-keychain-wizard.png'), animations: 'disabled' })
    await expect.poll(credentials, { timeout: 20_000 }).toMatchObject({ configured: [], verified: true, broken: ['deepseek'] })
    await expect(wizard).toBeVisible()
    await wizard.getByRole('button', { name: '下一页', exact: true }).click()
    await wizard.getByRole('button', { name: '下一页', exact: true }).click()
    await expect(wizard).toContainText('上一版保存的 key 解不开了')
  })
})
