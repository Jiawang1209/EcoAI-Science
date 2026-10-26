import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

function check(overrides: { brand?: string; lockVersion?: string; tag?: string } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ecoai-release-check-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'ecoai-science', version: '0.0.2', homepage: 'https://github.com/Jiawang1209/EcoAI-Science' }))
    const version = overrides.lockVersion ?? '0.0.2'
    writeFileSync(join(dir, 'package-lock.json'), JSON.stringify({ version, packages: { '': { name: 'ecoai-science', version } } }))
    const name = overrides.brand ?? 'EcoAI-Science'
    writeFileSync(join(dir, 'electron-builder.yml'), `productName: ${name}\nexecutableName: ${name}\nartifactName: ${name}-\${version}-\${os}-\${arch}.\${ext}\n`)
    return spawnSync(process.execPath, [resolve('scripts/verify-release.mjs')], { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_REF: `refs/tags/${overrides.tag ?? 'v0.0.2'}`, GITHUB_REPOSITORY: 'Jiawang1209/EcoAI-Science' } })
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

it('accepts matching EcoAI source, version, tag and lockfile', () => {
  const result = check()
  expect(result.status, result.stderr).toBe(0)
})
it('rejects a historical DAWN package even if its version matches the tag', () => {
  const result = check({ brand: 'DAWN-Science' })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('EcoAI-Science')
})
it('rejects a stale lockfile', () => {
  const result = check({ lockVersion: '0.0.1' })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('package-lock.json')
})
it('rejects a tag that does not match the package version', () => {
  const result = check({ tag: 'v0.0.3' })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('v0.0.3')
})
