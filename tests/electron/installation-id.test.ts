import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getInstallationId } from '../../src/electron/installation-id.js'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })
function fixture(platform: NodeJS.Platform = 'darwin') {
  const root = mkdtempSync(join(tmpdir(), 'ecoai-install-id-'))
  roots.push(root)
  const bundle = join(root, 'EcoAI.app')
  const resourcesPath = join(bundle, 'Contents', 'Resources')
  const executablePath = join(bundle, 'Contents', 'MacOS', 'EcoAI')
  const entryPath = join(resourcesPath, 'app', 'main.js')
  const create = () => {
    mkdirSync(join(bundle, 'Contents', 'MacOS'), { recursive: true })
    mkdirSync(join(resourcesPath, 'app'), { recursive: true })
    writeFileSync(executablePath, 'same version executable')
    writeFileSync(entryPath, 'same version main')
  }
  create()
  return { root, bundle, create, options: { platform, executablePath, resourcesPath, entryPath } }
}

it('同一次 macOS 安装重启身份稳定，不受用户数据写入影响', () => {
  const f = fixture()
  const id = getInstallationId(f.options)
  expect(id).toMatch(/^[a-f0-9]{64}$/)
  writeFileSync(join(f.root, 'credentials.json'), 'synthetic credential metadata')
  expect(getInstallationId(f.options)).toBe(id)
})

it('同版本、同路径的 macOS 包重新安装也获得新身份', () => {
  const f = fixture()
  const id = getInstallationId(f.options)
  renameSync(f.bundle, `${f.bundle}.previous`)
  f.create()
  expect(getInstallationId(f.options)).not.toBe(id)
})

it('Windows NSIS 每次安装 GUID 更新，即使 exe 未变也识别为新安装', () => {
  const f = fixture('win32')
  const marker = join(f.options.resourcesPath, 'ecoai-installation-id')
  writeFileSync(marker, '{12345678-1234-4321-8000-123456789abc}')
  const id = getInstallationId(f.options)
  expect(getInstallationId(f.options)).toBe(id)
  writeFileSync(marker, '{87654321-1234-4321-8000-123456789abc}')
  expect(getInstallationId(f.options)).not.toBe(id)
})

it('Windows 便携版按原始 exe 判断，不因每次解包到新临时目录重新引导', () => {
  const f = fixture('win32'), other = fixture('win32')
  const portablePath = join(f.root, 'EcoAI-portable.exe')
  writeFileSync(portablePath, 'portable binary')
  const id = getInstallationId({ ...f.options, portablePath })
  expect(getInstallationId({ ...other.options, portablePath })).toBe(id)
  renameSync(portablePath, `${portablePath}.old`)
  writeFileSync(portablePath, 'portable binary')
  expect(getInstallationId({ ...f.options, portablePath })).not.toBe(id)
})

it('旧 Windows 安装无 GUID 或损坏 GUID 时仍以包文件身份判断', () => {
  const f = fixture('win32')
  const id = getInstallationId(f.options)
  writeFileSync(join(f.options.resourcesPath, 'ecoai-installation-id'), 'bad marker')
  expect(getInstallationId(f.options)).toBe(id)
})

it('macOS App Translocation 的临时挂载变化不改变原始安装身份', () => {
  const original = fixture()
  const translocated = { ...original.options,
    executablePath: '/private/tmp/AppTranslocation/first/d/EcoAI.app/Contents/MacOS/EcoAI',
    entryPath: '/private/tmp/AppTranslocation/first/d/EcoAI.app/Contents/Resources/app/main.js',
    resourcesPath: '/private/tmp/AppTranslocation/first/d/EcoAI.app/Contents/Resources',
  }
  const resolveOriginal = () => original.bundle
  expect(getInstallationId(translocated, resolveOriginal)).toBe(getInstallationId(original.options))
  expect(getInstallationId({ ...translocated,
    executablePath: translocated.executablePath.replace('/first/', '/second/'),
    entryPath: translocated.entryPath.replace('/first/', '/second/'),
    resourcesPath: translocated.resourcesPath.replace('/first/', '/second/'),
  }, resolveOriginal)).toBe(getInstallationId(original.options))
})
