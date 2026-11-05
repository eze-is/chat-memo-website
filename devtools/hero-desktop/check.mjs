import { createRequire } from 'node:module'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = dirname(fileURLToPath(import.meta.url))
const desktop = resolve(root, '../../../desktop')
const require = createRequire(join(desktop, 'package.json'))
const ts = require('typescript')
const config = ts.readConfigFile(join(desktop, 'tsconfig.web.json'), ts.sys.readFile)
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, desktop)
const options = { ...parsed.options, noEmit: true, baseUrl: desktop, paths: { ...parsed.options.paths, '@desktop/*': ['src/renderer/src/*'], react: ['node_modules/@types/react/index.d.ts'], 'react/jsx-runtime': ['node_modules/@types/react/jsx-runtime.d.ts'], 'react-dom/client': ['node_modules/@types/react-dom/client.d.ts'] }, types: [], typeRoots: [join(desktop, 'node_modules/@types')] }
const program = ts.createProgram([join(root, 'main.tsx'), join(root, 'fixture.tsx')], options)
// 此检查只拥有官网新增输入与装配；Desktop其他在途源码仍由其仓库验收。
const errors = ts.getPreEmitDiagnostics(program).filter(item => item.file?.fileName.startsWith(root))
console.log(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }))
console.log(`Hero source diagnostics: ${errors.length}`)
process.exitCode = errors.length ? 1 : 0
if (!errors.length) {
  const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const module = { exports: {} }
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const imports = id => {
      const target = id.startsWith('@desktop/') ? join(desktop, 'src/renderer/src', id.slice(9)) : resolve(dirname(file), id)
      return /\.(png|svg|webp)$/.test(target) ? target : load(target)
    }
    new vm.Script(`(function(require,module,exports){${js}\n})`, { filename: file }).runInNewContext()(imports, module, module.exports)
    cache.set(file, module.exports)
    return module.exports
  }
  const { SOURCES } = load(join(desktop, 'src/renderer/src/product/v1-data.ts'))
  const { fixture } = load(join(root, 'fixture.tsx'))
  const initial = fixture(false, false, false), saved = fixture(false, true, false)
  const expected = SOURCES.filter(source => source.id !== 'google-ai-mode').map(source => source.id).sort()
  assert.deepEqual([...new Set(initial.recordList.map(item => item.source))].sort(), [...expected])
  for (const id of expected) assert.equal(initial.recordList.filter(item => item.source === id).length, 3, id)
  for (const data of [initial, saved]) {
    assert.equal(data.conversations[0].source, 'claude', 'Default reading source is Claude')
    assert.deepEqual([...data.recordList.slice(0, 5).map(item => item.source)], ['claude', 'chatgpt', 'workbuddy', 'doubao', 'deepseek-harness'])
  }
  assert.equal(initial.sources.reduce((sum, item) => sum + item.saved, 0), initial.home.savedToday)
  assert.equal(saved.sources.reduce((sum, item) => sum + item.saved, 0), saved.home.savedToday)
  assert.equal(saved.home.savedToday - initial.home.savedToday, 2)
  assert.equal(saved.storage.reduce((sum, item) => sum + item.messages, 0) - initial.storage.reduce((sum, item) => sum + item.messages, 0), 2)
  assert.ok(saved.home.activities.every(item => item.turns > 0))
  const formalLayout = fs.readFileSync(join(desktop, 'src/renderer/src/live/LibraryDesktop.tsx'), 'utf8').match(/recentActivityLayout="([^"]+)"/)[1]
  const heroLayout = fs.readFileSync(join(root, 'main.tsx'), 'utf8').match(/recentActivityLayout="([^"]+)"/)[1]
  assert.equal(heroLayout, formalLayout, 'Hero follows the current formal activity layout')
  console.log(`Fixture checks passed: ${expected.length} sources, ${initial.recordList.length} conversations, consistent save increment, current activity layout.`)
}
