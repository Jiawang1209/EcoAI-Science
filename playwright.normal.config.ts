import { defineConfig } from '@playwright/test'
import base from './playwright.config.js'

// Isolate the real-kernel spec by filename, never by text in unrelated titles.
export default defineConfig(base, { testIgnore: '**/kernel-session.spec.ts' })
