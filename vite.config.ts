import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/polish-notation/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
