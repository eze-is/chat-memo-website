import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@desktop/i18n/i18n.tsx'
import { messageCatalogs, type MessageCatalogs } from '@desktop/i18n/locale.ts'
import { MemoryPrompt } from '@desktop/product/memory-prompt.tsx'
import { V1Window } from '@desktop/product/v1.tsx'
import { fixture, connection, actions, settingsActions } from '../../hero-desktop/fixture.tsx'
import '@desktop/globals.css'
import '@desktop/product/v1.css'
import '@desktop/desktop-shell.css'
import '../../hero-desktop/stage.css'
import './style.css'

// 分享图使用独立匿名场景，不改变官网动态演示或正式 App 的数据与布局。
const english = new URLSearchParams(location.search).get('lang') === 'en'
const locale = english ? 'en' : 'zh-CN'
const data = fixture(english, true, true)
const conversation = {
  id: 'social-bookshop-home', source: 'claude-code',
  title: english ? 'A homepage for our bookshop' : '社区书店的首页设计',
  day: english ? 'Today' : '今天', time: '14:40',
  messages: [
    { id: 'social-question', role: 'user' as const, text: english ? 'Design a welcoming bookshop homepage with a book club and this week’s events.' : '帮我设计一个社区书店的首页，突出读书会和本周活动。' },
    { id: 'social-answer', role: 'assistant' as const, text: english ? 'Let’s make it feel like an invitation to the neighborhood.\n\n## A good book. A place to stay.\n\nPut this week’s book club first, with the time and a clear way to join.' : '可以把首页做成一封给街坊的邀请。\n\n## 好书，也值得坐下来慢慢读\n\n首屏介绍书店，接着展示本周读书会的主题、时间和报名入口。' },
  ],
}
data.conversations = [conversation, ...data.conversations]
data.recordList = [conversation, ...data.recordList]
const catalogs: MessageCatalogs = {
  'zh-CN': { ...messageCatalogs['zh-CN'], reading: { ...messageCatalogs['zh-CN'].reading, memoryPromptCompact: '换个 AI 继续聊' } },
  en: { ...messageCatalogs.en, reading: { ...messageCatalogs.en.reading, memoryPromptCompact: 'Continue in another AI' } },
}
const noop = (): void => {}
document.documentElement.dataset.platform = 'mac'
function Scene(): React.JSX.Element {
  return <div className="social-product"><div className="desktop-viewport"><V1Window data={data} conn={connection} actions={actions} settingsActions={settingsActions}
    refresh={{ updatedAt: Date.UTC(2026, 10, 5, 6, 40), now: Date.UTC(2026, 10, 5, 6, 41), busy: false, read: noop }}
    onConnectionPresence={noop} nPill="apple-lens" width={1120} height={720} initialTab="chats" guide={null} tryOnce={null} recentActivityLayout="content" /></div><MemoryPrompt className="social-continue" variant="compact" sources={data.localFound} onClick={noop} /></div>
}
createRoot(document.getElementById('root')!).render(<I18nProvider initialLocale={locale} catalogs={catalogs}><Scene /></I18nProvider>)
