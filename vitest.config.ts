/**
 * vitest.config.ts
 *
 * DB/Next 런타임 없이 **순수 함수**만 테스트하도록 구성.
 * tsconfig 의 `@/*` alias 를 그대로 쓰기 위해 경로 별칭을 추가한다.
 */

import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    globals: false,
  },
})
