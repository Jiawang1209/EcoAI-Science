import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { 读引导完成, 记引导完成, 读跳过, 记跳过 } from '../../src/ui/setup-wizard.js'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())
const installation = (id: string) => vi.stubGlobal('dawn', { installationId: id })

it('打包后的新安装不继承旧版全局完成/跳过记录', () => {
  localStorage.setItem('dawn.global.setupSkipped', '1')
  localStorage.setItem('dawn.global.onboardingDone', '1')
  installation('installation-a')
  expect(读跳过()).toBe(false)
  expect(读引导完成()).toBe(false)
  expect(localStorage.getItem('dawn.global.setupSkipped')).toBe('1')
})

it('同安装记住明确跳过，换一次安装重新引导，彼此不覆盖', () => {
  installation('installation-a')
  记跳过(true)
  记引导完成()
  installation('installation-b')
  expect(读跳过()).toBe(false)
  expect(读引导完成()).toBe(false)
  记跳过(true)
  installation('installation-a')
  expect(读跳过()).toBe(true)
  expect(读引导完成()).toBe(true)
  记跳过(false)
  expect(读跳过()).toBe(false)
  installation('installation-b')
  expect(读跳过()).toBe(true)
})

it('开发启动仍兼容旧存储键，不因构建时间每天重复引导', () => {
  记跳过(true)
  expect(localStorage.getItem('dawn.global.setupSkipped')).toBe('1')
  expect(读跳过()).toBe(true)
})
