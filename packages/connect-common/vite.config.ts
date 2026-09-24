import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const root = fileURLToPath(new URL('.', import.meta.url))
const dist = resolve(root, 'dist')

/**
 * `vite build` produces the library as single files — ESM (`index.js`) and CJS
 * (`index.cjs`) plus one rolled-up `index.d.ts` — so the output has no relative
 * specifiers for Node's ESM resolver to trip on.
 */
export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts'],
      rollupTypes: true,
      // The rolled-up declarations have no relative imports, so the same file
      // serves `require` consumers as `.d.cts`.
      afterBuild: () =>
        copyFileSync(resolve(dist, 'index.d.ts'), resolve(dist, 'index.d.cts')),
    }),
  ],
  build: {
    sourcemap: false,
    lib: {
      entry: resolve(root, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
  },
})
