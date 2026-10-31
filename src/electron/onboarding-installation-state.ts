import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

function bindScope(file: string, installationId: string, onboardingId: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(`${file}.tmp`, JSON.stringify({ installationId, onboardingId }), { mode: 0o600 })
  renameSync(`${file}.tmp`, file)
}

/** A binding is specific to one physical installation, never a global "already seen" flag. */
export function installationOnboardingScope(file: string, installationId: string): string {
  try {
    const previous = JSON.parse(readFileSync(file, 'utf8'))
    if (previous.installationId === installationId && typeof previous.onboardingId === 'string' && /^[a-zA-Z0-9-]{1,128}$/.test(previous.onboardingId)) return previous.onboardingId
  } catch { /* A fresh or unreadable record needs the introduction. */ }
  bindScope(file, installationId, installationId)
  return installationId
}

/** Called only after the in-app updater has successfully replaced the package. */
export function preserveUpdatedOnboarding(file: string, onboardingId: string, installedId: string): void {
  bindScope(file, installedId, onboardingId)
}
