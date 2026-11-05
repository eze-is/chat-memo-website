import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

// 官网只消费已导出的静态资源；App拥有文案与图标定义。
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const desktop = resolve(root, '../desktop')
const require = createRequire(resolve(desktop, 'package.json'))
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server'), lucide = require('lucide-react')
const sourcePath = 'src/renderer/src/product/v1.tsx', copyPath = 'src/shared/pro-plan-copy.json'
const source = readFileSync(resolve(desktop, sourcePath), 'utf8')
const ast = ts.createSourceFile('v1.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let definition, check
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'PLAN_ICONS') definition = node.initializer
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'Check' && node.attributes.properties.some(p => p.name?.getText(ast) === 'className' && p.initializer?.text === 'v1-tier-ok')) check = node
  ts.forEachChild(node, visit)
}
visit(ast)
function icon(node) {
  if (!node || !ts.isJsxSelfClosingElement(node)) throw new Error('App方案图标定义无效')
  const name = node.tagName.getText(ast), props = { 'aria-hidden': true, focusable: 'false' }
  for (const p of node.attributes.properties) if (['size', 'strokeWidth'].includes(p.name?.getText(ast))) {
    if (!ts.isNumericLiteral(p.initializer?.expression)) throw new Error('App图标尺寸定义无效')
    props[p.name.getText(ast)] = Number(p.initializer.expression.text)
  }
  if (!lucide[name] || !props.size || !props.strokeWidth) throw new Error('App图标定义不完整')
  return renderToStaticMarkup(React.createElement(lucide[name], props))
}
if (!definition || !ts.isObjectLiteralExpression(definition) || !check) throw new Error('App方案映射缺失')
const icons = Object.fromEntries(definition.properties.map(p => [p.name.getText(ast), icon(p.initializer)]))
const copy = JSON.parse(readFileSync(resolve(desktop, copyPath), 'utf8'))
const content = JSON.stringify({ schemaVersion: 1, source: { icons: sourcePath + '#PLAN_ICONS', copy: copyPath,
  iconHash: createHash('sha256').update(JSON.stringify(icons)).digest('hex'), copyHash: createHash('sha256').update(JSON.stringify(copy)).digest('hex') }, icons, check: icon(check), copy }, null, 2) + '\n'
const output = resolve(root, 'resource/pro-plan-presentation.json')
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== content) throw new Error('官网方案资源未同步App，请运行导出脚本')
} else writeFileSync(output, content)
console.log('App plan icons and shared copy are synchronized.')
