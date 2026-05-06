import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.tsbuild/**'],
    environment: 'node',
    passWithNoTests: true,
  },
});
