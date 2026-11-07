import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { I18nProvider } from '@desktop/i18n/i18n.tsx'
import { messageCatalogs, type MessageCatalogs } from '@desktop/i18n/locale.ts'
import { ProSheet, V1Window, type Tab } from '@desktop/product/v1.tsx'
import { fixture, connection, actions, settingsActions } from './fixture.tsx'
import '@desktop/globals.css'
import '@desktop/product/v1.css'
import '@desktop/desktop-shell.css'
import './stage.css'

const locale = new URLSearchParams(location.search).get('locale') === 'en' ? 'en' : 'zh-CN'
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const tabs = ['home', 'chats', 'connect'] as const
const duration = { home: 3600, chats: 8750, connect: 4800 }
// 入页先留两秒看默认列表；输入后的每个阶段仍保持原有节奏。
const stepAt = (tab: Tab, elapsed: number): number => tab === 'home' ? elapsed < 850 ? 0 : elapsed < 2300 ? 1 : 2 : tab === 'chats' ? elapsed < 2000 ? 0 : elapsed < 2300 ? 1 : elapsed < 2850 ? 2 : elapsed < 4450 ? 3 : elapsed < 4800 ? 4 : elapsed < 8150 ? 5 : 6 : elapsed < 900 ? 0 : elapsed < 2800 ? 1 : 2
// 官网只呈现能力效果，按钮文案与正式 App 的付费入口分开拥有。
const heroCatalogs: MessageCatalogs = {
  'zh-CN': { ...messageCatalogs['zh-CN'], workspace: { ...messageCatalogs['zh-CN'].workspace,
    proValue: value => ({ ...messageCatalogs['zh-CN'].workspace.proValue(value), actionLabel: '与另一个 AI 接着聊' }) } },
  en: { ...messageCatalogs.en, workspace: { ...messageCatalogs.en.workspace,
    proValue: value => ({ ...messageCatalogs.en.workspace.proValue(value), actionLabel: 'Continue with another AI' }) } },
}
const noop = (): void => {}
document.documentElement.dataset.platform = 'mac'
const navButtons = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('.v1-brow .v1-pills:not(.v1-gear-pills) button')]
type TouchTargets = { tabs?: CSSProperties; action?: CSSProperties }

function Projection(): React.JSX.Element {
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight })
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [savingEnabled, setSavingEnabled] = useState(false)
  const [touchTargets, setTouchTargets] = useState<TouchTargets>({})
  const outsideFocus = useRef<HTMLElement | null>(null)
  const [scene, setScene] = useState<{ tab: 'home' | 'chats' | 'connect'; step: number; run: number }>({ tab: 'home', step: 0, run: 0 })
  const clock = useRef({ tab: 'home' as 'home' | 'chats' | 'connect', elapsed: 0, previous: 0, playing: false, frame: 0, step: 0, run: 0, pinned: false, automatic: false, inspecting: false, comparisonSeen: false })
  const english = locale === 'en'
  const virtualWidth = 1120, virtualHeight = 720
  const scaled = viewport.width < 640
  const canvasWidth = scaled ? virtualWidth : viewport.width
  const canvasHeight = scaled ? virtualHeight : viewport.height
  const scale = scaled ? Math.min(viewport.width / virtualWidth, viewport.height / virtualHeight) : 1
  function openComparison(manual: boolean): void {
    clock.current.inspecting = manual
    clock.current.comparisonSeen = true
    const active = parent !== window ? parent.document.activeElement : null
    outsideFocus.current = !manual && active !== frameElement ? active as HTMLElement | null : null
    setComparisonOpen(true)
  }
  function closeComparison(): void {
    clock.current.inspecting = false
    setComparisonOpen(false)
  }
  function changeTab(tab: Tab): void {
    if (!tabs.includes(tab as typeof tabs[number])) return
    const state = clock.current
    if (!state.automatic) state.pinned = true
    closeComparison()
    state.comparisonSeen = false
    state.tab = tab as typeof tabs[number]; state.elapsed = 0; state.previous = 0; state.step = 0; state.run++
    setScene({ tab: state.tab, step: 0, run: state.run })
    parent.postMessage({ type: 'chatmemo:hero:tab', tab: state.tab }, location.origin)
  }
  function selectTab(tab: typeof tabs[number]): void {
    navButtons()[tabs.indexOf(tab)]?.click()
  }
  function userClick(event: MouseEvent): void {
    const target = event.target as Element
    // 让编排走正式的一键开启动作，用户点击其他深层控件仍会被拦住。
    if (!event.isTrusted && clock.current.tab === 'connect' && clock.current.step === 1 && target.closest('.v1-allon button')) return
    if (target.closest('.v1-brow .v1-pills:not(.v1-gear-pills) button')) {
      return
    }
    if (target.closest('.v1-sheet-x')) return
    event.preventDefault(); event.stopPropagation()
    // 演示入口只打开对比弹窗，拦住正式组件的方案与付费路径。
    if (event.isTrusted && clock.current.tab === 'chats' && target.closest('.memory-prompt.is-compact')) openComparison(true)
  }
  useEffect(() => {
    // 原生弹窗会聚焦标题；自动演示不能抢走官网其他位置的焦点。
    if (!comparisonOpen) return
    const action = document.querySelector<HTMLButtonElement>('.v1-value-cta')
    if (action) action.tabIndex = -1
    if (!outsideFocus.current) return
    ;(frameElement as HTMLElement | null)?.blur()
    outsideFocus.current.focus({ preventScroll: true })
  }, [comparisonOpen])
  useEffect(() => {
    const state = clock.current
    function stop(): void { cancelAnimationFrame(state.frame); state.frame = 0; state.previous = 0 }
    function tick(now: number): void {
      state.frame = 0
      if (!state.playing || reduced.matches || document.hidden) { state.previous = 0; return }
      if (state.inspecting) { state.previous = 0; state.frame = requestAnimationFrame(tick); return }
      if (state.previous) state.elapsed += now - state.previous
      state.previous = now
      if (state.elapsed >= duration[state.tab]) {
        if (state.pinned) { state.elapsed %= duration[state.tab]; state.run++; state.step = -1; state.comparisonSeen = false }
        else {
          state.automatic = true
          navButtons()[(tabs.indexOf(state.tab) + 1) % tabs.length]?.click()
          state.automatic = false
        }
      }
      const step = stepAt(state.tab, state.elapsed)
      if (step !== state.step) { state.step = step; setScene({ tab: state.tab, step, run: state.run }) }
      state.frame = requestAnimationFrame(tick)
    }
    function resume(): void { if (state.playing && !reduced.matches && !document.hidden && !state.frame) state.frame = requestAnimationFrame(tick) }
    const receive = (event: MessageEvent): void => {
      if (event.origin !== location.origin || event.source !== parent) return
      if (event.data?.type === 'chatmemo:hero:select-tab') {
        const button = navButtons()[tabs.indexOf(event.data.tab)]
        if (button) {
          button.click()
        }
        return
      }
      if (event.data?.type !== 'chatmemo:hero:playback' || typeof event.data.playing !== 'boolean') return
      state.playing = event.data.playing
      if (state.playing) resume(); else stop()
    }
    const visibility = (): void => { if (document.hidden || reduced.matches) stop(); else resume() }
    const resize = (): void => setViewport({ width: innerWidth, height: innerHeight })
    addEventListener('message', receive); addEventListener('resize', resize)
    document.addEventListener('visibilitychange', visibility); reduced.addEventListener('change', visibility)
    void document.fonts.ready.then(() => parent.postMessage({ type: 'chatmemo:hero:ready' }, location.origin))
    return () => { stop(); removeEventListener('message', receive); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', visibility) }
  }, [])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const buttons = navButtons()
      if (buttons.length !== tabs.length) { setTouchTargets({}); return }
      const first = buttons[0].getBoundingClientRect()
      const last = buttons.at(-1)!.getBoundingClientRect()
      const tabsWidth = Math.max(132, last.right - first.left + 44)
      const tabsCenter = (first.left + last.right) / 2
      const tabsTarget = {
        left: tabsCenter - tabsWidth / 2,
        top: (first.top + first.bottom) / 2 - 22,
        width: tabsWidth,
        height: 44,
      }
      const action = comparisonOpen ? null : document.querySelector<HTMLButtonElement>('.memory-prompt.is-compact')
      const rect = action?.getBoundingClientRect()
      setTouchTargets({
        tabs: tabsTarget,
        action: rect && rect.width > 0 && rect.height > 0 ? {
          left: rect.left + rect.width / 2 - Math.max(44, rect.width) / 2,
          top: rect.top + rect.height / 2 - 22,
          width: Math.max(44, rect.width),
          height: 44,
        } : undefined,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [scene, viewport, comparisonOpen])
  useEffect(() => {
    document.documentElement.dataset.scene = `${scene.tab}-${scene.step}`
    document.documentElement.dataset.manual = String(clock.current.pinned)
    if (!clock.current.inspecting && (scene.tab !== 'chats' || scene.step !== 5)) setComparisonOpen(false)
    if (scene.tab === 'connect' && scene.step === 0) setSavingEnabled(false)
    const scroll = document.querySelector<HTMLElement>('.v1-scroll')
    if (scene.step === 0) scroll?.scrollTo({ top: 0 })
    if (scene.tab === 'chats') {
      const input = document.querySelector<HTMLInputElement>('.v1-rec-search input')
      if (input && (scene.step <= 2 || scene.step === 4)) {
        const query = scene.step === 1 ? (english ? 'book' : '书') : scene.step === 2 ? (english ? 'bookshop' : '书店') : ''
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, query)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      if (scene.step === 5 && !clock.current.comparisonSeen) openComparison(false)
    }
    if (scene.tab === 'connect' && scene.step === 1) document.querySelector<HTMLButtonElement>('.v1-allon button')?.click()
    if (scene.tab === 'connect' && scene.step === 2 && scroll) {
      const web = document.querySelector<HTMLElement>('[aria-labelledby="cn-ext"]')
      if (web) scroll.scrollTo({ top: web.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop - 16, behavior: reduced.matches ? 'instant' : 'smooth' })
    }
    // 对比弹窗也只展示，能力／付款按钮不开放；右上角关闭仍可用。
    for (const element of document.querySelectorAll<HTMLElement>('.v1-scroll button:not(.memory-prompt.is-compact), .v1-scroll input, .v1-scroll a, .v1-gear-pills button, .v1-help, .v1-refresh')) element.tabIndex = -1
    for (const input of document.querySelectorAll<HTMLInputElement>('.v1-scroll input')) input.readOnly = true
  }, [scene, english])
  const conn = { ...connection, local: Object.fromEntries(Object.entries(connection.local).map(([id, value]) => [id, { ...value, save: scene.tab !== 'connect' || scene.step > 0 && savingEnabled }])) }
  return <>
    <div className={`hero-product-canvas${scaled ? ' is-scaled' : ''}`} onClickCapture={userClick} style={{ width: canvasWidth, height: canvasHeight, transform: scaled ? `scale(${scale})` : undefined, left: scaled ? (viewport.width - canvasWidth * scale) / 2 : 0, '--hero-scale': scale, '--hero-width': `${canvasWidth}px`, '--hero-height': `${canvasHeight}px` } as CSSProperties}>
      <div className="desktop-viewport"><V1Window data={fixture(english, scene.tab !== 'home' || scene.step >= 1, scene.tab !== 'home' || scene.step >= 2)} conn={conn} actions={{ ...actions, enableAllSaving: () => setSavingEnabled(true) }} settingsActions={settingsActions}
        refresh={{ updatedAt: Date.UTC(2026, 10, 5, 6, 40), now: Date.UTC(2026, 10, 5, 6, 41), busy: false, read: noop }}
        modelConfiguration={comparisonOpen ? <ProSheet onClose={closeComparison} /> : undefined}
        onConnectionPresence={noop} onTab={changeTab} nPill="apple-lens" width={canvasWidth} height={canvasHeight} initialTab="home" guide={null} tryOnce={null} recentActivityLayout="content" /></div>
    </div>
    <div className="hero-touch-targets" aria-hidden="true">
      {touchTargets.tabs && <div className="hero-touch-target is-tabs" style={touchTargets.tabs} onTouchStart={(event) => {
        event.preventDefault()
        const rect = event.currentTarget.getBoundingClientRect()
        const index = Math.min(tabs.length - 1, Math.max(0, Math.floor((event.touches[0].clientX - rect.left) / rect.width * tabs.length)))
        selectTab(tabs[index])
      }} />}
      {touchTargets.action && <div className="hero-touch-target is-action" style={touchTargets.action} onTouchStart={(event) => {
        event.preventDefault()
        openComparison(true)
      }} />}
    </div>
  </>
}
createRoot(document.getElementById('root')!).render(<I18nProvider initialLocale={locale} catalogs={heroCatalogs}><Projection /></I18nProvider>)
