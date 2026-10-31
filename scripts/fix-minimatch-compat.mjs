/** Keep legacy CommonJS glob consumers working with the upstream security-fixed matcher.
 * Restore callable exports and glob 7's pattern hooks; matching still uses the upstream
 * nonrecursive engine. The ESM entry and preprocessing limits remain unchanged.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function fixMinimatchCompat(root) {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  const marker = '// EcoAI: legacy CommonJS minimatch callable export'
  const patch = `\n${marker}
const legacyMatcher = require('@isaacs/nonrecursive-glob-match').Matcher;
Object.defineProperty(legacyMatcher.prototype, '_glob', {
  configurable: true, get() { return this.pattern; }
});
Object.defineProperty(legacyMatcher.prototype, Symbol.match, {
  configurable: true, value(input) {
    const text = String(input);
    if (!this.test(text)) return null;
    return Object.assign([text], { index: 0, input: text });
  }
});
module.exports = Object.assign(exports.minimatch, exports);
`
  let changed = 0
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path.endsWith('node_modules/minimatch') || !existsSync(join(root, path))) continue
    if (entry.version !== '11.0.1') throw new Error(`Unexpected minimatch version at ${path}: ${entry.version}`)
    const target = join(root, path, 'dist/commonjs/index.js')
    const source = readFileSync(target, 'utf8')
    if (source.endsWith(patch)) continue
    const original = source.split(`\n${marker}`)[0]
    writeFileSync(target, `${original}${patch}`)
    changed++
  }
  return changed
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`fix-minimatch-compat: ${fixMinimatchCompat(process.cwd())} CommonJS export(s) updated`)
}
