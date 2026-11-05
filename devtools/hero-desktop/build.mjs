import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

// 只在本地构建时复用正式 Renderer；输出为可独立部署的静态网页。
const root = dirname(fileURLToPath(import.meta.url))
const desktop = resolve(root, '../../../desktop')
const require = createRequire(resolve(desktop, 'package.json'))
execFileSync(process.execPath, [resolve(root, '../download-effects/build.mjs')], { stdio: 'inherit' })
execFileSync(process.execPath, [resolve(root, '../export-pro-plan-presentation.mjs')], { stdio: 'inherit' })
execFileSync('uv', ['run', '--with', 'fonttools', '--with', 'brotli', 'python', resolve(root, 'subset-font.py')], { stdio: 'inherit' })
const { build } = await import(require.resolve('vite'))
const react = (await import(require.resolve('@vitejs/plugin-react'))).default
await build({
  configFile: false, root, base: '/resource/hero-desktop/', publicDir: false,
  plugins: [react(), {
    name: 'hero-font-licenses',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'poster.png', source: readFileSync(resolve(root, 'poster.png')) })
      for (const file of ['MiSans-LICENSE.pdf', 'Geist-LICENSE.txt']) this.emitFile({ type: 'asset', fileName: `licenses/${file}`, source: readFileSync(resolve(desktop, 'src/renderer/public/licenses', file)) })
    },
  }],
  resolve: {
    alias: [
      { find: /^.*\/MiSansVF\.woff2$/, replacement: resolve(root, '.generated/MiSans-hero.woff2') },
      { find: '@desktop', replacement: resolve(desktop, 'src/renderer/src') },
      { find: 'react', replacement: dirname(require.resolve('react/package.json')) },
      { find: 'react-dom', replacement: dirname(require.resolve('react-dom/package.json')) },
    ], dedupe: ['react', 'react-dom'],
  },
  build: { outDir: resolve(root, '../../resource/hero-desktop'), emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0 },
})
