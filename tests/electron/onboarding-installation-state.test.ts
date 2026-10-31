import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { installationOnboardingScope, preserveUpdatedOnboarding } from '../../src/electron/onboarding-installation-state.js'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })
const file = () => {
  const root = mkdtempSync(join(tmpdir(), 'ecoai-onboarding-state-')); roots.push(root)
  return join(root, 'state.json')
}
it('初次安装和同次重启使用相同引导作用域，手动重装使用新作用域', () => {
  const f = file()
  expect(installationOnboardingScope(f, 'install-a')).toBe('install-a')
  expect(installationOnboardingScope(f, 'install-a')).toBe('install-a')
  expect(installationOnboardingScope(f, 'install-b')).toBe('install-b')
})
it('自动更新后保留旧引导作用域，之后手动重装不继承更新交接', () => {
  const f = file()
  installationOnboardingScope(f, 'install-a')
  preserveUpdatedOnboarding(f, 'install-a', 'updated-b')
  expect(installationOnboardingScope(f, 'updated-b')).toBe('install-a')
  expect(installationOnboardingScope(f, 'updated-b')).toBe('install-a')
  expect(installationOnboardingScope(f, 'manual-c')).toBe('manual-c')
})
