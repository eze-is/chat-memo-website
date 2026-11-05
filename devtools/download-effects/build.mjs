import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// 从 App 的实际实现导出静态闭包；官网不维护另一套流光配方。
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const product = resolve(root, '../desktop/src/renderer/src/product')
const require = createRequire(resolve(root, '../desktop/package.json'))
const postcss = createRequire(require.resolve('vite'))('postcss')
const ts = require('typescript')
function select(file, rules, animations = []) {
  const ast = postcss.parse(readFileSync(resolve(product, file), 'utf8'))
  function keep(node) {
    if (node.type === 'rule') return rules.includes(node.selector) ? node.clone() : null
    if (node.type !== 'atrule') return null
    if (node.name === 'keyframes') return animations.includes(node.params) ? node.clone() : null
    if (node.name !== 'media') return null
    const children = node.nodes.map(keep).filter(Boolean)
    return children.length ? node.clone({ nodes: children }) : null
  }
  const nodes = ast.nodes.map(keep).filter(Boolean)
  for (const rule of rules) {
    let found = false
    ast.walkRules(node => { if (node.selector === rule) found = true })
    if (!found) throw new Error(`App 流光规则缺失: ${rule}`)
  }
  return `/* App: product/${file} */\n${nodes.join('\n')}`
}
const surface = select('v1.css', ['.v1-try-sweep', '.v1-try-sweep::before'], ['v1-try-sweep']) + '\n' + readFileSync(resolve(product, 'glass-flow.css'), 'utf8')
const edge = select('continue-conversation-dialog.css', ['.continue-copy-edge', '.continue-copy > .continue-copy-edge', '.continue-copy-edge rect', '.continue-copy-edge-glow', '.continue-copy-edge-trail', '.continue-copy-edge-head'], ['continue-copy-edge-lap'])
const source = ts.createSourceFile('continue-conversation-dialog.tsx', readFileSync(resolve(product, 'continue-conversation-dialog.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let trail
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'EDGE_LIGHT_TRAIL') {
    const array = node.initializer.expression
    trail = array.elements.map(element => Object.fromEntries(element.properties.map(property => [property.name.getText(source), property.initializer.text])))
  }
  ts.forEachChild(node, visit)
}
visit(source)
if (trail?.length !== 6) throw new Error('App 边缘流光轨迹缺失')
// 对比稿适配官网大胶囊：App 的拖尾等比加长，颜色与轨迹保留。
const svg = `<svg class="continue-copy-edge" aria-hidden="true" focusable="false"><rect class="continue-copy-edge-glow" pathLength="1000"/>${trail.map(({ length, opacity, color }) => `<rect class="continue-copy-edge-trail" pathLength="1000" style="--edge-length:${length * 2.4}px;opacity:${Math.min(.6, opacity * 1.8)};stroke:${color}"/>`).join('')}<rect class="continue-copy-edge-head" pathLength="1000"/></svg>`
writeFileSync(resolve(root, 'resource/download-effects.css'), `/* 自动生成：node devtools/download-effects/build.mjs。颜色、动画与减少动态规则由 App 源码拥有。 */\n${surface}\n${edge}\n`)
const template = readFileSync(resolve(root, 'devtools/download-effects/template.html'), 'utf8')
writeFileSync(resolve(root, 'devtools/download-effects/index.html'), template.replace('<!-- APP_EDGE -->', svg))
console.log('Exported App glass-flow / perimeter light and comparison page.')
