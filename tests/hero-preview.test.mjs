import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../hero-preview.js', import.meta.url), 'utf8')
class Element {
  listeners = new Map(); dataset = {}; attributes = new Map(); children = []; hidden = true
  addEventListener(type, fn) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]) }
  fire(type, event = {}) { for (const fn of this.listeners.get(type) ?? []) fn({ target: this, preventDefault() {}, ...event }) }
  setAttribute(key, value) { this.attributes.set(key, value) }
  hasAttribute(key) { return this.attributes.has(key) }
  contains(target) { return target === this || this.children.some(child => child.contains(target)) }
  focus() { this.focused = true }
}
function harness(locale = 'zh-CN') {
  const root = new Element(), frame = new Element(), video = new Element(), desktop = new Element(), plugin = new Element(), trigger = new Element(), menu = new Element(), desktopLayer = new Element(), pluginLayer = new Element()
  const doc = new Element(), win = new Element(), reduced = new Element()
  doc.documentElement = { lang: locale }; doc.hidden = false; reduced.matches = false
  plugin.children = [trigger, menu]
  const cta = new Element(), ctaTrigger = new Element(), ctaMenu = new Element()
  cta.children = [ctaTrigger, ctaMenu]
  plugin.querySelector = selector => ({ '.hero-extension-trigger': trigger, '.hero-extension-menu': menu }[selector])
  cta.querySelector = selector => ({ '.hero-extension-trigger': ctaTrigger, '.hero-extension-menu': ctaMenu }[selector])
  doc.querySelectorAll = () => [plugin, cta]
  root.querySelector = selector => ({ iframe: frame, video, '[data-preview-desktop]': desktopLayer, '[data-preview-plugin]': pluginLayer }[selector])
  doc.querySelector = selector => ({ '[data-hero-preview]': root, '.hero-action-secondary .download-dropdown': plugin }[selector])
  doc.getElementById = id => ({ 'hero-desktop-download-btn': desktop, 'hero-download-btn': trigger, 'hero-extension-menu': menu }[id])
  const messages = []
  frame.contentWindow = { postMessage: message => messages.push(message) }
  frame.dataset.src = '/resource/hero-desktop/index.html'
  Object.defineProperty(frame, 'src', { get: () => frame.attributes.get('src'), set: value => frame.attributes.set('src', value) })
  video.paused = true; video.playCount = 0
  video.pause = () => { video.paused = true }
  video.play = () => { video.playCount++; video.paused = false; return Promise.resolve() }
  let observer
  class Observer { constructor(callback) { this.callback = callback; observer = this } observe() {} disconnect() { this.disconnected = true } fire(ratio) { this.callback([{ intersectionRatio: ratio }]) } }
  vm.runInNewContext(source, { document: doc, location: { href: 'https://chatmemo.ai/zh-CN/', origin: 'https://chatmemo.ai' }, URL, matchMedia: () => reduced, IntersectionObserver: Observer, addEventListener: win.addEventListener.bind(win) })
  const ready = event => win.fire('message', { origin: 'https://chatmemo.ai', source: frame.contentWindow, data: { type: 'chatmemo:hero:ready' }, ...event })
  return { root, frame, video, desktop, plugin, trigger, menu, cta, ctaTrigger, ctaMenu, doc, win, reduced, messages, observer, ready }
}
test('默认桌面端，进入可见区域才加载；只接受自己frame的就绪消息', () => {
  const h = harness()
  assert.equal(h.root.dataset.preview, 'desktop'); assert.equal(h.frame.src, undefined)
  h.observer.fire(.7)
  assert.equal(new URL(h.frame.src).searchParams.get('locale'), 'zh-CN')
  h.ready({ origin: 'https://other.example' }); h.ready({ source: {} })
  assert.equal(h.messages.length, 0)
  h.ready(); assert.equal(h.messages.at(-1).playing, true)
})
test('悬停或键盘聚焦切换预览；下载点击没有被脚本接管', () => {
  const h = harness(); h.observer.fire(1); h.ready()
  h.plugin.fire('pointerenter', { pointerType: 'mouse' })
  assert.equal(h.root.dataset.preview, 'plugin'); assert.equal(h.video.paused, false); assert.equal(h.messages.at(-1).playing, false)
  h.desktop.fire('focus')
  assert.equal(h.root.dataset.preview, 'desktop'); assert.equal(h.video.paused, true); assert.equal(h.messages.at(-1).playing, true)
  assert.equal(h.desktop.listeners.has('click'), false)
  h.plugin.fire('focusin'); assert.equal(h.root.dataset.preview, 'plugin')
})
test('下拉支持悬停、点击、Escape和外部关闭，触摸不会被hover提前打开', () => {
  const h = harness()
  h.plugin.fire('pointerenter', { pointerType: 'touch' }); assert.equal(h.menu.hidden, true)
  h.trigger.fire('click'); assert.equal(h.menu.hidden, false); assert.equal(h.trigger.attributes.get('aria-expanded'), 'true')
  h.plugin.fire('keydown', { key: 'Escape' }); assert.equal(h.menu.hidden, true); assert.equal(h.trigger.focused, true)
  h.plugin.fire('pointerenter', { pointerType: 'mouse' }); assert.equal(h.menu.hidden, false)
  h.doc.fire('click', { target: new Element() }); assert.equal(h.menu.hidden, true)
})
test('离屏、后台及减少动态暂停；BFCcache恢复后继续，不重建桌面窗口', () => {
  const h = harness('ja'); h.observer.fire(1); h.ready()
  const initialSource = h.frame.src
  assert.equal(new URL(initialSource).searchParams.get('locale'), 'en')
  h.observer.fire(0); assert.equal(h.messages.at(-1).playing, false)
  h.observer.fire(1); h.doc.hidden = true; h.doc.fire('visibilitychange'); assert.equal(h.messages.at(-1).playing, false)
  h.doc.hidden = false; h.reduced.matches = true; h.reduced.fire('change'); assert.equal(h.messages.at(-1).playing, false)
  h.reduced.matches = false; h.win.fire('pagehide'); assert.equal(h.messages.at(-1).playing, false)
  h.win.fire('pageshow', { persisted: true }); assert.equal(h.frame.src, initialSource); assert.equal(h.messages.at(-1).playing, true)
})
test('退出或切换后，迟到的视频play结果不能重新开始播放', async () => {
  const h = harness(); h.observer.fire(1); h.ready()
  let finish
  h.video.play = () => new Promise(resolve => { finish = () => { h.video.paused = false; resolve() } })
  h.plugin.fire('focusin'); h.win.fire('pagehide'); finish()
  await Promise.resolve(); await Promise.resolve()
  assert.equal(h.video.paused, true)
})

test('页尾菜单可独立操作，不切换首屏预览，点击另一组时关闭原菜单', () => {
  const h = harness(); h.observer.fire(1); h.ready()
  h.cta.fire('pointerenter', { pointerType: 'mouse' })
  assert.equal(h.ctaMenu.hidden, false); assert.equal(h.root.dataset.preview, 'desktop')
  h.cta.fire('keydown', { key: 'Escape' })
  assert.equal(h.ctaMenu.hidden, true); assert.equal(h.ctaTrigger.focused, true)
  h.trigger.fire('click'); assert.equal(h.menu.hidden, false)
  h.ctaTrigger.fire('click'); h.doc.fire('click', { target: h.ctaTrigger })
  assert.equal(h.ctaMenu.hidden, false); assert.equal(h.menu.hidden, true)
  h.cta.fire('focusout', { relatedTarget: h.desktop }); assert.equal(h.ctaMenu.hidden, true)
})
