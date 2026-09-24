import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const root = fileURLToPath(new URL('.', import.meta.url))
const srcEntry = resolve(root, 'src/index.ts')
const packagesDir = resolve(root, '..')
// Resolve the shared schemas to source so the loader bundles them (single
// install / self-contained global build) with no inter-package build ordering.
const commonSrc = resolve(packagesDir, 'connect-common/src/index.ts')

// Shared alias map (same shape in both branches so the config's type is stable).
// Aliasing the package's own name is a no-op for `build` (it enters via srcEntry)
// but lets the demo import it by its published name during `serve`.
const alias = {
  '@usemogul/connect-js': srcEntry,
  '@usemogul/connect-common': commonSrc,
}

/**
 * - `vite` (serve) runs the demo harness on a fixed origin.
 * - `vite build` produces the library: ESM + UMD/global (`window.MogulConnect`)
 *   plus `.d.ts`, with `@usemogul/connect-common` bundled in.
 */
export default defineConfig(({ command }) =>
  command === 'serve'
    ? {
        root: 'demo',
        server: {
          port: 4000,
          strictPort: true,
          fs: { allow: [packagesDir] },
        },
        resolve: { alias },
      }
    : {
        plugins: [
          dts({
            include: ['src'],
            exclude: ['src/**/*.test.ts'],
            // Pin the root to this package's src, else the plugin roots above the
            // package (it sees the bundled connect-common sources) and nests the
            // output under dist/connect-js/src.
            entryRoot: 'src',
            insertTypesEntry: true,
          }),
        ],
        resolve: { alias },
        build: {
          sourcemap: false,
          lib: {
            entry: srcEntry,
            name: 'MogulConnect',
            formats: ['es', 'umd'],
            fileName: format =>
              format === 'es' ? 'index.js' : 'index.umd.cjs',
          },
        },
      },
)
