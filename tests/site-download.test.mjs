import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'site-download.js'), 'utf8')
const flush = () => new Promise(resolve => setImmediate(resolve))
function harness({ hostname = 'chatmemo.ai', fetchImpl } = {}) {
  const documentHandlers = {}, closeHandlers = {}, buttonHandlers = {}, assigned = [], calls = []
  const choose = { hidden: false }, failure = { hidden: true }, error = { hidden: true }
  const closeButton = { addEventListener(name, fn) { buttonHandlers[name] = fn } }
  const dialog = {
    open: false, contains: anchor => !!anchor.inDialog,
    querySelector(selector) { return ({ '[data-download-choose-title]': choose, '[data-download-failure-title]': failure, '[data-download-error]': error, '[data-download-close]': closeButton })[selector] },
    addEventListener(name, fn) { closeHandlers[name] = fn },
    showModal() { this.open = true },
    close() { this.open = false; closeHandlers.close?.() },
  }
  const location = { hostname, origin: `https://${hostname}`, href: `https://${hostname}/zh-CN/`, assign(value) { assigned.push(value) } }
  const document = { getElementById(id) { return id === 'download-dialog' ? dialog : null }, addEventListener(name, fn) { documentHandlers[name] = fn } }
  const fetch = async (...args) => { calls.push(args); return fetchImpl(...args) }
  const window = { location, fetch }
  vm.runInNewContext(source, { window, document, fetch, URL, AbortController, setTimeout, clearTimeout })
  function anchor(path = '/desktop/download?link=website', inDialog = false) {
    const attrs = new Map()
    return { href: `https://chatmemo.ai${path}`, target: '', inDialog, focused: false,
      hasAttribute: key => attrs.has(key), setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key), focus() { this.focused = true } }
  }
  function click(element, options = {}) {
    const event = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
      target: { closest: () => element }, preventDefault() { this.defaultPrevented = true }, ...options }
    documentHandlers.click(event); return event
  }
  return { dialog, choose, failure, error, assigned, calls, anchor, click, buttonHandlers }
}
const ready = path => ({ ok: true, async json() { return { status: 'ready', path } } })
const valid = '/desktop/releases/v1.2.3/chatmemo-1.2.3-arm64.dmg'

test('下载准备成功后只在原窗口交给浏览器，www 也使用主域网关', async () => {
  const h = harness({ hostname: 'www.chatmemo.ai', fetchImpl: async () => ready(valid) })
  const e = h.click(h.anchor())
  await flush()
  assert.equal(e.defaultPrevented, true)
  assert.equal(h.calls[0][0], 'https://chatmemo.ai/desktop/download/prepare?link=website')
  assert.deepEqual(h.assigned, ['https://chatmemo.ai' + valid])
})

test('Intel 下载使用 Intel 准备入口，并接受固定版本的 Intel DMG', async () => {
  const intel = '/desktop/releases/v1.2.3/chatmemo-1.2.3-x64.dmg'
  const h = harness({ fetchImpl: async () => ready(intel) })
  h.click(h.anchor('/desktop/download/mac-intel?link=website'))
  await flush()
  assert.equal(h.calls[0][0], 'https://chatmemo.ai/desktop/download/prepare/mac-intel?link=website')
  assert.deepEqual(h.assigned, ['https://chatmemo.ai' + intel])
})

test('不可信目的地与准备失败显示弹窗，而不是跳转错误页面', async () => {
  for (const value of ['https://evil.example/file', '/desktop/releases/v1.2.3/chatmemo-9.9.9-arm64.dmg', '/desktop/releases/v1.2.3/chatmemo-1.2.3-arm64.dmg?x=1']) {
    const h = harness({ fetchImpl: async () => ready(value) }); h.click(h.anchor()); await flush()
    assert.equal(h.dialog.open, true); assert.equal(h.failure.hidden, false); assert.deepEqual(h.assigned, [])
  }
  const h = harness({ fetchImpl: async () => ({ ok: false }) }); h.click(h.anchor()); await flush()
  assert.equal(h.dialog.open, true); assert.equal(h.failure.hidden, false)
  h.click(h.anchor('/desktop/download/mac?link=website', true)); await flush()
  assert.equal(h.error.hidden, false); assert.equal(h.dialog.open, true)
})

test('无法识别设备时允许选择系统，关闭弹窗后忽略迟到结果', async () => {
  let resolveRetry, call = 0
  const h = harness({ fetchImpl: async () => ++call === 1 ? { ok: true, json: async () => ({ status: 'choose' }) } : new Promise(resolve => { resolveRetry = resolve }) })
  const original = h.anchor(); h.click(original); await flush()
  assert.equal(h.dialog.open, true); assert.equal(h.choose.hidden, false)
  h.click(h.anchor('/desktop/download/mac?link=website', true)); await flush()
  h.dialog.close(); resolveRetry(ready(valid)); await flush()
  assert.deepEqual(h.assigned, []); assert.equal(original.focused, true)
})

test('带修饰键或其他网站链接保留浏览器原生行为', () => {
  const h = harness({ fetchImpl: async () => ready(valid) })
  assert.equal(h.click(h.anchor(), { metaKey: true }).defaultPrevented, false)
  const external = h.anchor(); external.href = 'https://example.com/desktop/download?link=website'
  assert.equal(h.click(external).defaultPrevented, false)
  assert.equal(h.calls.length, 0)
})
