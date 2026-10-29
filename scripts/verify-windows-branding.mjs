/** First argument is the main app EXE, followed by setup/portable EXEs. Reads PE resources without executing Windows code. */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { Data, NtExecutable, NtExecutableResource, Resource } from 'resedit'

const root = resolve(import.meta.dirname, '..')
const product = 'EcoAI-Science'
const expected = Data.IconFile.from(readFileSync(join(root, 'packaging', 'icon.ico')))
const hashes = items => items.map(item => createHash('sha256')
  .update(Buffer.from(item.isRaw() ? item.bin : item.generate())).digest('hex')).sort()
const reference = JSON.stringify(hashes(expected.icons.map(icon => icon.data)))
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const files = process.argv.slice(2)
if (!files.length) files.push(
  join(root, 'release', 'win-unpacked', `${product}.exe`),
  join(root, 'release', `${product}-${version}-win-${process.arch}.exe`),
  join(root, 'release', `${product}-${version}-win-${process.arch}-portable.exe`),
)
for (const [index, file] of files.entries()) {
  const executable = NtExecutable.from(readFileSync(file), { ignoreCert: true })
  const resource = NtExecutableResource.from(executable)
  const group = Resource.IconGroupEntry.fromEntries(resource.entries)[0]
  if (!group || JSON.stringify(hashes(group.getIconItemsFromEntries(resource.entries))) !== reference)
    throw new Error(`EcoAI icon mismatch: ${file}`)
  if (index === 0) {
    const names = Resource.VersionInfo.fromEntries(resource.entries).flatMap(info =>
      info.getAllLanguagesForStringValues().map(language => info.getStringValues(language)))
    if (!names.length || names.some(value => value.ProductName !== product || value.FileDescription !== product))
      throw new Error(`EcoAI-Science product metadata mismatch: ${file}`)
    console.log(`[windows-branding] full product name verified: ${product}`)
  }
  console.log(`[windows-branding] verified ${expected.icons.length} EcoAI icon frames: ${file}`)
}
