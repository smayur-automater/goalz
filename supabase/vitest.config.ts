import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    // Tests share one database; run files one at a time.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
