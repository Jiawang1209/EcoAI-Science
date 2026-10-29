import { afterEach, expect, it } from 'vitest'
import { Data, NtExecutable, NtExecutableResource, Resource } from 'resedit'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })
type Kind = 'approved' | 'missing-icon' | 'wrong-primary' | 'wrong-name' | 'wrong-description' | 'missing-version'
function fixture(kind: Kind) {
  const dir = mkdtempSync(join(tmpdir(), 'ecoai-pe-brand-')); roots.push(dir)
  const exe = NtExecutable.createEmpty(false, false), resources = NtExecutableResource.from(exe)
  const icons = Data.IconFile.from(readFileSync(resolve('packaging/icon.ico'))).icons.map(icon => icon.data)
  if (kind !== 'missing-icon' && kind !== 'wrong-primary') Resource.IconGroupEntry.replaceIconsForResource(resources.entries, 1, 1033, icons)
  if (kind === 'wrong-primary') {
    const changed = Buffer.from((icons[0] as Data.RawIconItem).bin); changed[changed.length - 1]! ^= 1
    Resource.IconGroupEntry.replaceIconsForResource(resources.entries, 1, 1033, [Data.RawIconItem.from(changed, 16, 16, 32)])
    Resource.IconGroupEntry.replaceIconsForResource(resources.entries, 2, 1033, icons)
  }
  if (kind !== 'missing-version') Resource.VersionInfo.create(1033, {}, [{lang: 1033, codepage: 1200, values: {
    ProductName: kind === 'wrong-name' ? 'Electron' : 'EcoAI-Science',
    FileDescription: kind === 'wrong-description' ? 'EcoAI' : 'EcoAI-Science',
  }}]).outputToResourceEntries(resources.entries)
  resources.outputResource(exe)
  const file = join(dir, 'EcoAI-Science.exe'); writeFileSync(file, Buffer.from(exe.generate()))
  return spawnSync(process.execPath, [resolve('scripts/verify-windows-branding.mjs'), file], { encoding: 'utf8', timeout: 10000 })
}
it('ships all seven Windows icon sizes', () => {
  const ico = Data.IconFile.from(readFileSync(resolve('packaging/icon.ico')))
  expect(ico.icons.map(x => x.width || 256)).toEqual([16, 24, 32, 48, 64, 128, 256])
})
it('accepts the exact EcoAI primary icon and full product name', () => {
  const result = fixture('approved')
  expect(result.status, result.stderr).toBe(0)
  expect(result.stdout).toContain('[windows-branding] verified')
})
it.each(['missing-icon', 'wrong-primary'] as const)('rejects %s even if a secondary group has EcoAI', kind => {
  const result = fixture(kind)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain('EcoAI icon mismatch')
})
it.each(['wrong-name', 'wrong-description', 'missing-version'] as const)('rejects %s with a valid icon', kind => {
  const result = fixture(kind)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain('EcoAI-Science product metadata mismatch')
})
