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
