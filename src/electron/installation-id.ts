import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'

interface InstallationFiles {
  platform: NodeJS.Platform
  executablePath: string
  entryPath: string
  resourcesPath: string
  /** Original portable exe/AppImage, never its per-launch extraction directory. */
  portablePath?: string | undefined
}

/** An installation identity contains no credentials and never writes inside a signed bundle. */
function originalMacBundle(bundle: string): string | undefined {
  // Gatekeeper can launch the unchanged bundle from a different read-only mount.
  // This system diagnostic is optional: timeout/failure falls back to showing onboarding.
  const output = execFileSync('/usr/bin/security', ['translocate-original-path', bundle], { encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'pipe'] })
  return output.split(/\r?\n/).find(line => line.startsWith('\t/'))?.slice(1)
}

export function getInstallationId(files: InstallationFiles, resolveOriginal = originalMacBundle): string {
  if (files.platform === 'darwin' && files.executablePath.includes('/AppTranslocation/')) {
    const bundle = dirname(dirname(dirname(files.executablePath)))
    const original = resolveOriginal(bundle)
    if (!original?.endsWith('.app') || original.includes('/AppTranslocation/')) throw new Error('Original installed application could not be identified')
    const rebase = (path: string) => {
      const suffix = relative(bundle, path)
      if (suffix.startsWith('..')) throw new Error('Application entry is outside its bundle')
      return join(original, suffix)
    }
    files = { ...files, executablePath: rebase(files.executablePath), entryPath: rebase(files.entryPath), resourcesPath: rebase(files.resourcesPath) }
  }
  const hash = createHash('sha256').update(files.platform)
  if (files.platform === 'win32' && !files.portablePath) {
    let marker = ''
    try { marker = readFileSync(join(files.resourcesPath, 'ecoai-installation-id'), 'utf8').trim().replace(/[{}]/g, '').toLowerCase() } catch { /* Older installers had no marker. */ }
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(marker)) {
      return hash.update(JSON.stringify([realpathSync(files.executablePath), marker])).digest('hex')
    }
  }
  const paths = files.portablePath ? [files.portablePath] : [
    ...(files.platform === 'darwin' ? [dirname(dirname(dirname(files.executablePath)))] : []),
    files.executablePath, files.entryPath,
  ]
  for (const path of paths) {
    const stat = statSync(path, { bigint: true })
    // ctime is intentionally excluded: signing/quarantine/permission changes are not reinstalls.
    hash.update(JSON.stringify([realpathSync(path), stat.dev, stat.ino, stat.birthtimeNs, stat.mtimeNs, stat.size].map(String)))
  }
  return hash.digest('hex')
}
