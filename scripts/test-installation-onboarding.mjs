/** Isolated macOS packaged acceptance. Never modifies the supplied package or installed app. */
import { _electron, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { startMockInferenceServer, mockModelsJson } from './mock-inference-server.mjs'
import { getInstallationId } from '../src/electron/installation-id.ts'
import { preserveUpdatedOnboarding } from '../src/electron/onboarding-installation-state.ts'

if (process.platform !== 'darwin' || !process.argv[2]) throw new Error('Pass a macOS packaged executable to this test')
const sourceExe = resolve(process.argv[2])
const sourceBundle = dirname(dirname(dirname(sourceExe)))
if (!sourceBundle.endsWith('.app')) throw new Error('Expected an executable inside a .app bundle')
const dir = mkdtempSync(join(tmpdir(), 'ecoai-packaged-install-onboarding-'))
const bundle = join(dir, 'EcoAI-Science.app')
execFileSync('/bin/cp', ['-cR', sourceBundle, bundle])
console.log(`Isolated package: ${bundle}`)
const executablePath = join(bundle, 'Contents', 'MacOS', basename(sourceExe))
const server = await startMockInferenceServer()
const profile = join(dir, 'profile'), workspace = join(dir, 'workspace')
mkdirSync(workspace, { recursive: true })
const config = join(dir, 'providers.yaml'), models = join(dir, 'models.json')
writeFileSync(config, 'agents: {}\n')
writeFileSync(models, JSON.stringify(mockModelsJson(server.url)))
let app, page
const launch = async () => {
  console.log('Launching packaged app')
  app = await _electron.launch({ timeout: 60_000, executablePath, args: [`--user-data-dir=${profile}`, '--use-mock-keychain', '--password-store=basic'], env: {
    ...process.env, DAWN_CONFIG: config, DAWN_DB: join(dir, 'dawn.db'), DAWN_MODELS_JSON: models,
    DAWN_SKIP_CREDENTIAL_GATE: '1', DAWN_HIDE_WINDOW: '1', DAWN_CREDENTIAL_SOURCE: '',
    DAWN_DEFAULT_WORKSPACE: workspace, DAWN_SCRATCH_ROOT: join(dir, 'scratch'),
    DAWN_CLI_HOME: join(dir, 'cli'), DAWN_SKILLS_DIR: join(dir, 'skills'),
    DAWN_MEMORIES_DIR: join(dir, 'memories'), DAWN_AGENTS_DIR: join(dir, 'agents'),
    DAWN_ONBOARDING_INSTALLATION_ID: 'must-not-override-packaged-identity',
  } })
  console.log('Packaged app connected')
  expect(await app.evaluate(({ app }) => app.isPackaged)).toBe(true)
  expect(await app.evaluate(({ app }) => app.commandLine.hasSwitch('use-mock-keychain'))).toBe(true)
  page = await app.firstWindow()
  await page.addInitScript(() => localStorage.setItem('dawn.global.lang', 'zh'))
  await page.reload()
}
const wizard = () => page.locator('.setup-wizard')
const installation = () => page.evaluate(() => window.dawn.installationId)
const replaceBundle = (label) => {
  // Test-owned bundle only; original signed contents and version are retained.
  const previous = join(dir, `${label}.app`)
  renameSync(bundle, previous)
  mkdirSync(bundle)
  renameSync(join(previous, 'Contents'), join(bundle, 'Contents'))
}
try {
  await launch()
  const firstId = await installation()
  expect(firstId).toMatch(/^[a-f0-9]{64}$/)
  await page.evaluate(async () => {
    localStorage.setItem('dawn.global.setupSkipped', '1')
    localStorage.setItem('dawn.global.onboardingDone', '1')
    const result = await window.dawn.invoke('setCredential', { providerId: 'deepseek', secret: 'sk-synthetic-packaged-install' })
    if (!result.ok) throw new Error('Unable to save synthetic isolated credential')
  })
  await page.reload()
  await expect(wizard().getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeVisible()
  // Wait for warm() and verified credentials: the introduction must not disappear afterward.
  await expect.poll(() => page.evaluate(async () => (await window.dawn.invoke('listCredentials', {})).data), { timeout: 20_000 })
    .toMatchObject({ configured: ['deepseek'], verified: true })
  await expect(wizard()).toContainText('第 1 步，共 4 步')
  await page.screenshot({ path: join(dir, '01-recovered-key-welcome.png') })
  for (let i = 0; i < 3; i++) await wizard().getByRole('button', { name: '下一页', exact: true }).click()
  await expect(wizard().getByRole('heading', { name: '连接你的计算环境' })).toBeVisible()
  await wizard().getByRole('button', { name: '跳过，进入工作台', exact: true }).click()
  await expect(wizard()).toHaveCount(0)
  await app.close()
  await launch()
  expect(await installation()).toBe(firstId)
  await expect(wizard()).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '今天想分析什么？' })).toBeVisible()
  await app.close()
  // Exercise the exact post-update binding helper used by the real installer callback.
  replaceBundle('before-automatic-update')
  const entryPath = join(bundle, 'Contents', 'Resources', 'app', 'dist', 'electron', 'main.js')
  preserveUpdatedOnboarding(join(profile, 'onboarding-installation.json'), firstId, getInstallationId({
    platform: 'darwin', executablePath, entryPath, resourcesPath: join(bundle, 'Contents', 'Resources'),
  }))
  await launch()
  expect(await installation()).toBe(firstId)
  await expect(wizard()).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '今天想分析什么？' })).toBeVisible()
  await app.close()
  // Replace only this test-owned bundle root, keeping its signed contents, version and path.
  // This models the filesystem identity change from installing the same app again.
  replaceBundle('before-manual-reinstall')
  await launch()
  expect(await installation()).not.toBe(firstId)
  await expect(wizard().getByRole('heading', { name: '欢迎使用 EcoAI-Science' })).toBeVisible()
  await expect(wizard()).toContainText('第 1 步，共 4 步')
  await expect.poll(() => page.evaluate(async () => (await window.dawn.invoke('listCredentials', {})).data), { timeout: 20_000 })
    .toMatchObject({ configured: ['deepseek'], verified: true })
  await expect(wizard()).toBeVisible()
  await page.screenshot({ path: join(dir, '02-reinstalled-welcome.png') })
  console.log('PASS: recovered credentials keep step 1; completion persists across restart and simulated automatic update; same-version manual replacement restarts step 1.')
  console.log(`Evidence: ${dir}`)
} finally {
  await app?.close().catch(() => {})
  await server.close()
}
