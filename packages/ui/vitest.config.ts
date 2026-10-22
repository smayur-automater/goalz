import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const svgWeb = path.join(
  path.dirname(require.resolve('react-native-svg/package.json')),
  'lib/module/ReactNativeSVG.web.js',
);

// Components are tested on web through react-native-web, which renders real DOM
// that Testing Library and axe can inspect. Native behaviour is covered by
// React Native Testing Library and Maestro in the app (Milestone 3).
export default defineConfig({
  plugins: [react()],
  define: { __DEV__: true },
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      // The CommonJS build skips the .web files; use the web ES module directly.
      { find: /^react-native-svg$/, replacement: svgWeb },
    ],
    mainFields: ['module', 'browser', 'main'],
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    server: { deps: { inline: ['react-native-svg', 'lucide-react-native', 'react-native-web'] } },
  },
});
