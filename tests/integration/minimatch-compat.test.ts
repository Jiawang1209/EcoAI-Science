import { afterEach, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

it('新版修复仍能供旧版 glob 的函数式 CommonJS API 使用', () => {
  const root = mkdtempSync(join(tmpdir(), 'ecoai-glob-compat-')); roots.push(root)
  mkdirSync(join(root, 'nested'))
  writeFileSync(join(root, 'a.csv'), 'a')
  writeFileSync(join(root, 'nested', 'b.csv'), 'b')
  writeFileSync(join(root, 'nested', 'skip.txt'), 'skip')
  const globPath = require.resolve('glob', { paths: [dirname(require.resolve('archiver-utils'))] })
  const output = execFileSync(process.execPath, ['-e', `
    const glob = require(process.argv[1]);
    glob('**/*.csv', { cwd: process.argv[2], nodir: true }, (error, paths) => {
      if (error) throw error;
      console.log(JSON.stringify(paths));
    });
  `, globPath, root], { timeout: 5000, encoding: 'utf8' })
  const matched = JSON.parse(output) as string[]
  expect(matched.sort()).toEqual(['a.csv', 'nested/b.csv'])
})

it('现代 ESM 的命名导出继续匹配文件和排除隐藏文件', async () => {
  const { minimatch, Minimatch } = await import('minimatch')
  expect(minimatch('analysis/model.R', '**/*.{R,py}')).toBe(true)
  expect(minimatch('.private.csv', '*.csv')).toBe(false)
  expect(new Minimatch('**/*.csv').match('data/measurements.csv')).toBe(true)
})

it('对抗性 **/.. 模式在有界子进程中完成预处理，不发生指数放大', () => {
  const output = execFileSync(process.execPath, ['-e', `
    const { Minimatch } = require('minimatch');
    const pattern = Array(30).fill('**/../a/b').join('/');
    const matcher = new Minimatch(pattern, { optimizationLevel: 2, braceExpandMax: 64 });
    if (matcher.set.length > 64) throw Error('unbounded pattern expansion');
    console.log('bounded');
  `], { cwd: process.cwd(), timeout: 5000, encoding: 'utf8' })
  expect(output.trim()).toBe('bounded')
})
