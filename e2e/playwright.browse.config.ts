import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

export default defineConfig({
  testDir: './tests', testMatch: 'highlight-browse.spec.ts', workers: 1,
  timeout: 30_000, expect: { timeout: 10_000 }, reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3102', locale: 'ko-KR', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node fixtures/highlight-browse-api.cjs', wait: { stdout: /Browse fixture API ready/ } },
    { cwd: path.resolve(__dirname, '..'), command: 'node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start -p 3102 -H 127.0.0.1', wait: { stdout: /Ready in/ }, env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:18082/api', API_INTERNAL_URL: 'http://127.0.0.1:18082/api' }, timeout: 120_000 },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
