import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../site-download.js', import.meta.url), 'utf8')
  .replace('    setupDownloadMenus();', '    globalThis.detectDevice = detectDevice;')

async function detect(hints) {
  const node = { hidden: false, addEventListener() {} }
  const dialog = { showModal() {}, querySelector() { return node }, addEventListener() {} }
  const context = { navigator: { userAgentData: hints }, document: { getElementById: () => dialog, addEventListener() {} }, window: { fetch() {} } }
  vm.runInNewContext(source, context)
  return context.detectDevice()
}
const hints = (platform, architecture, bitness = '64', mobile = false) => ({
  platform, mobile, async getHighEntropyValues() { return { architecture, bitness } },
})

test('只为可信的系统和芯片信息推荐已提供的安装包', async () => {
  assert.equal(await detect(hints('macOS', 'arm')), 'mac')
  assert.equal(await detect(hints('macOS', 'x86')), 'mac-intel')
  assert.equal(await detect(hints('Windows', 'x86')), 'win')
  assert.equal(await detect(hints('Windows', 'arm')), null)
  assert.equal(await detect(hints('macOS', 'x86', '32')), null)
  assert.equal(await detect(hints('macOS', 'arm', '64', true)), null)
  assert.equal(await detect(undefined), null)
  assert.equal(await detect({ platform: 'macOS', getHighEntropyValues: async () => { throw Error('denied') } }), null)
})
