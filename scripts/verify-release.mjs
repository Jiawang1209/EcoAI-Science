/** Validate the checked-out source before creating a tag or packaging a release. */
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
  const builder = parse(readFileSync('electron-builder.yml', 'utf8'))
  if (pkg.name !== 'ecoai-science' || pkg.homepage !== 'https://github.com/Jiawang1209/EcoAI-Science') {
    throw new Error('不是 EcoAI-Science 的源码，拒绝发布')
  }
  if (builder.productName !== 'EcoAI-Science' || builder.executableName !== 'EcoAI-Science' ||
      !builder.artifactName?.startsWith('EcoAI-Science-')) {
    throw new Error('应用和附件名称必须为 EcoAI-Science，不能发布 DAWN 历史代码')
  }
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version || lock.packages?.['']?.name !== pkg.name) {
    throw new Error('package-lock.json 与 package.json 的名称或版本不一致')
  }
  const ref = process.env.GITHUB_REF ?? ''
  if (ref.startsWith('refs/tags/') && ref !== `refs/tags/v${pkg.version}`) {
    throw new Error(`标签 ${ref.slice(10)} 与 package.json 的 ${pkg.version} 不一致`)
  }
  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== 'Jiawang1209/EcoAI-Science') {
    throw new Error('发布仓库必须为 Jiawang1209/EcoAI-Science')
  }
  console.log(`发布核对通过：EcoAI-Science ${pkg.version}${ref ? ` (${ref})` : ''}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
