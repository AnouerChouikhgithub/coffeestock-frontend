import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    // e2e/*.spec.ts are Playwright tests; Vitest must not collect them.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'test-results/**'],
  },
})
