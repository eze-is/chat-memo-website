import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = dirname(fileURLToPath(import.meta.url))
const desktop = process.env.CHATMEMO_DESKTOP_DIR || resolve(root, '../../../../desktop')
const require = createRequire(resolve(desktop, 'package.json'))
const { build } = await import(require.resolve('vite'))
const react = (await import(require.resolve('@vitejs/plugin-react'))).default
await build({ configFile: false, root, base: './', publicDir: false, plugins: [react()],
  resolve: { alias: [
    { find: '@desktop', replacement: resolve(desktop, 'src/renderer/src') },
    { find: 'react', replacement: dirname(require.resolve('react/package.json')) },
    { find: 'react-dom', replacement: dirname(require.resolve('react-dom/package.json')) },
  ], dedupe: ['react', 'react-dom'] },
  build: { outDir: resolve(root, '../.generated'), emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0 },
})
