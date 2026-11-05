import type { Conv } from '@desktop/product/conversation-data.ts'
import type { Activity } from '@desktop/product/activity-data.ts'
import type { WindowData } from '@desktop/product/window-data.ts'
import type { Conn, ConnectionActions } from '@desktop/product/connection-data.ts'
import type { SettingsActions } from '@desktop/product/settings-data.ts'
import { SOURCES, byId } from '@desktop/product/v1-data.ts'

// 各平台均有独立虚构内容；不读取真实账号、对话、客户端连接或用户配置。
const topics: Record<string, string[]> = {
  codex: ['书店网站的开业首页', '让网站在手机上也好用', '开业活动的报名表单'],
  'claude-code': ['读书会活动页的结构', '邀请邮件的排版模板', '把报名数据导出成表格'],
  chatgpt: ['书店的空间与氛围', '今年的阅读计划', '新产品的用户画像'],
  claude: ['书店开业，给邻居的一封邀请', '一篇文章的结构与表达', '研究报告里的关键观点'],
  gemini: ['书店海报的视觉方向', '三种空间布局方案', '设计参考的优缺点对比'],
  deepseek: ['周末去山里走走', '产品定价的三种思路', 'SQL 学习笔记与练习'],
  doubao: ['书店开业的短视频脚本', '周末旅行的行程安排', '手冲咖啡的冲煮参数'],
  kimi: ['长文里的关键结论', '两份方案的差异对照', '会议纪要与后续行动'],
  qianwen: ['客户答复应该怎么写', '给书店做一套书签', '下个月的内容日历'],
  yuanbao: ['最近的行业变化', '研究文章的提纲', '值得继续追问的问题'],
  workbuddy: ['书店开业的工作清单', '用户访谈的提问清单', '项目会议的行动事项'],
  zcode: ['运营数据的查询报表', '一次接口错误的排查', '页面加载速度的优化'],
  'deepseek-harness': ['书店开业的任务拆解', '首页文案的三个方向', '历史数据的导入脚本'],
  'qwen-work': ['新品发布的资料整理', '季度复盘的演示提纲', '运营数据的整理与分析'],
}
const englishTopics: Record<string, string[]> = {
  codex: ['The bookshop opening website', 'A better mobile layout', 'The opening event signup form'],
  'claude-code': ['The book club event page', 'An invitation email template', 'Exporting registrations to a spreadsheet'],
  chatgpt: ['The bookshop space and atmosphere', 'A reading plan for the year', 'Who our new product is for'],
  claude: ['The bookshop opening: an invitation for our neighbors', 'Making an article clearer', 'Key ideas from a research report'],
  gemini: ['A visual direction for the bookshop', 'Three ways to arrange the space', 'Comparing design references'],
  deepseek: ['A weekend walk in the hills', 'Three ways to think about pricing', 'SQL notes and exercises'],
  doubao: ['A short video for the bookshop opening', 'A weekend travel itinerary', 'Pour-over coffee settings'],
  kimi: ['The key findings in a long article', 'Comparing two proposals', 'Meeting notes and next steps'],
  qianwen: ['Writing a reply to a customer', 'A set of bookshop bookmarks', 'Next month’s content calendar'],
  yuanbao: ['Recent changes in the industry', 'An outline for a research article', 'Questions worth exploring further'],
  workbuddy: ['The bookshop opening checklist', 'A user interview question list', 'Action items from the project meeting'],
  zcode: ['An operations data report', 'Investigating an API error', 'Making the page load faster'],
  'deepseek-harness': ['Planning the bookshop opening', 'Three directions for the homepage copy', 'A script for importing older data'],
  'qwen-work': ['Organizing a product launch', 'An outline for the quarterly review', 'Working with operations data'],
}
const supported = SOURCES.filter(source => Object.hasOwn(topics, source.id))
export function fixture(english: boolean, saved: boolean, recalled: boolean): WindowData {
  const conversations: Conv[] = supported.flatMap((source, sourceIndex) => topics[source.id].map((topic, index) => {
    const title = english ? englishTopics[source.id][index] : topic
    const id = `${source.id}-${index}`
    const answer = english
      ? `Let’s build on what we have already discussed.\n\n## ${title}\n\nStart with the outcome you want, then decide what matters most. Keep the useful parts of the previous plan and make the next step concrete.\n\n- Make the goal easy to understand\n- Keep the essential details together\n- Leave a clear next action\n\nWe can refine the wording and structure from here.`
      : `接着之前的讨论，我们可以先把重点收拢。\n\n## ${title}\n\n先明确想得到的结果，再决定哪些内容最重要。保留前面已经确定的方向，把下一步写得具体一点。\n\n- 让目标清楚、容易理解\n- 把关键的信息放在一起\n- 留下一个可以继续推进的行动\n\n接下来可以沿着这个结构，把措辞和细节补充完整。`
    return { id, source: source.id, title, day: index === 0 ? (english ? 'Today' : '今天') : (english ? 'Yesterday' : '昨天'), time: `${String(14 - index).padStart(2, '0')}:${String(38 - sourceIndex * 2).padStart(2, '0')}`, messages: [
      { id: `${id}-q`, role: 'user', text: english ? `Can we continue working on ${title.toLowerCase()}?` : `我们继续聊「${title}」，接下来应该怎么做？` },
      { id: `${id}-a`, role: 'assistant', text: answer },
      { id: `${id}-q2`, role: 'user', text: english ? 'Make the first step more specific.' : '把第一步再具体一点。' },
      { id: `${id}-a2`, role: 'assistant', text: english ? 'Write down the one decision that will unblock the rest of the work. Start there, and keep a record of what you learn.' : '先写下最影响后续工作的那一个决定，把它确定下来。推进时顺手记下新发现，下一次就可以沿着这条线继续。' },
    ] }
  }))
  const first = conversations.find(item => item.id === 'codex-0')!
  first.messages[1].text = english ? 'Start with an invitation.\n\n## A place to sit and read\n\nWe are opening a small neighborhood bookshop. Come for a book, a cup of coffee, or a conversation.\n\n### Opening weekend\n\n- Saturday, 2 pm: meet the neighbors\n- Sunday, 3 pm: bring a book you love\n\nKeep the opening hours and address easy to find.' : '先给来访的人一个清楚的邀请。\n\n## 一家可以坐下来读书的社区书店\n\n找一本喜欢的书，喝一杯咖啡，也可以只是来坐坐。\n\n### 开业周末的安排\n\n- 周六下午两点，和附近的邻居见个面\n- 周日下午三点，带一本喜欢的书来聊天\n\n页面接着放营业时间、地址和参加读书会的方式。'
  const fresh: Conv = { ...first, id: 'new-invitation', title: english ? 'The bookshop opening invitation is ready' : '书店的开业邀请写好了', time: '14:40', messages: [
    { id: 'invite-q', role: 'user', text: english ? 'Write a short invitation for our neighbors.' : '给附近居民写一封简短的开业邀请。' },
    { id: 'invite-a', role: 'assistant', text: english ? 'We have made room for some favorite books and a few good conversations. Come over this weekend. Bring a book, or just yourself.' : '我们在街角安顿了一些喜欢的书，也留了几个可以坐下来聊天的位置。这个周末，欢迎过来坐坐。带一本书，或者空着手来，都好。' },
  ] }
  const records = saved ? [fresh, ...conversations] : conversations
  // 列表首屏穿插来源，Claude 为默认阅读项；首页活动仍按自己的事件顺序呈现。
  const sourceOrder = [...new Set(['claude', 'chatgpt', 'workbuddy', 'doubao', 'deepseek-harness', ...supported.map(source => source.id)])]
  const today = english ? 'Today' : '今天'
  const readingRecords = [...records].sort((a, b) => Number(b.day === today) - Number(a.day === today) || sourceOrder.indexOf(a.source) - sourceOrder.indexOf(b.source) || b.time.localeCompare(a.time))
  const claude = conversations.find(item => item.id === 'claude-0')!
  claude.messages[0].text = english ? 'Write a warm opening invitation for our neighborhood bookshop.' : '给街角新开的书店写一封邀请，希望附近的邻居愿意来坐坐。'
  claude.messages[1].text = english ? '## A new bookshop around the corner\n\nWe have made room for books, coffee, and conversations with our neighbors.\n\nCome by this weekend. Bring a book you love, or just yourself. Stay for a little while and help us make this a place worth returning to.\n\n### Opening weekend\n\n- Saturday, 2 pm: meet the neighbors\n- Sunday, 3 pm: share a favorite book' : '## 街角多了一家书店，想请你来坐坐\n\n我们给喜欢的书留了位置，也给附近的邻居留了几张可以坐下来聊天的椅子。\n\n这个周末，欢迎来看看。带一本喜欢的书，或者空着手来，都好。喝杯咖啡、翻几页书，一起把这里变成一个想常来的地方。\n\n### 开业周末的安排\n\n- 周六下午两点：和附近的邻居见个面\n- 周日下午三点：带一本喜欢的书来聊聊'
  const activities: Activity[] = records.filter(item => item.day === (english ? 'Today' : '今天')).slice(0, 9).map((item, index) => ({ id: item.id, time: item.time, timestamp: Date.UTC(2026, 10, 5, 6, saved ? 40 : 38) - index * 120_000, actor: item.source, verb: '存下', turns: item.id === fresh.id ? 2 : 4, titles: [item.title], conversationIds: [item.id], adds: [item.id === fresh.id ? 2 : 4], at: ['end'] }))
  if (recalled) activities.unshift({ id: 'recall', time: '14:41', timestamp: Date.UTC(2026, 10, 5, 6, 41), actor: 'claude-code', verb: '读了', titles: [first.title, conversations.find(c => c.source === 'chatgpt')!.title], query: english ? 'Continue the bookshop project using our previous conversations' : '接着之前的书店项目聊', turns: 2 })
  // 示例库摘要与近期正文分开提供；动画新增的两条消息同时进入摘要和活动。
  const storage = supported.map((source, index) => ({ id: source.id, source, color: ['#7184e0', '#a787d4', '#5db5ad', '#dfa768', '#77a8d0', '#a1b85d'][index % 6], conversations: 164 - index * 9 + (saved && source.id === 'codex' ? 1 : 0), messages: 940 - index * 51 + (saved && source.id === 'codex' ? 2 : 0), bytes: 12000 }))
  return {
    today: '2026-11-05', conversations: readingRecords, recordList: readingRecords, days: [], storage,
    settings: { accountLabel: 'hello@example.com', proExpiry: { date: '2027-11-05', label: english ? 'Pro until Nov 5, 2027' : 'Pro 至 2027-11-05' }, directory: '~/.chatmemo', version: '1.0.2' },
    connectionDisplay: { modelDetails: null, pairingCode: { text: '', ariaLabel: 'Chat Memo' } },
    sources: storage.map((item, index) => ({ ...item.source, saved: [12, 18, 26, 10, 9, 8, 8, 7, 6, 6, 10, 8, 10, 8][index] + (saved && item.id === 'codex' ? 2 : 0), savedConversations: 3 + (saved && item.id === 'codex' ? 1 : 0), taken: item.id === 'claude-code' ? 2 : 0, providedContexts: item.id === 'claude-code' ? 2 : 0 })),
    localFound: supported.filter(source => !source.viaExtension).map(source => ({ id: source.id, count: 3, detected: true })), localMissing: [],
    setup: { localMessages: storage.filter(s => !s.source.viaExtension).reduce((n, s) => n + s.messages, 0), webMessages: storage.filter(s => s.source.viaExtension).reduce((n, s) => n + s.messages, 0), webConversations: 24 },
    home: { empty: false, savedToday: saved ? 148 : 146, takenToday: recalled ? 4 : 3, savedBars: [38, 56, 49, 80, 62, 98, 81, 112, 128, 95, 116, 130, 138, saved ? 148 : 146], takenBars: [0, 0, 1, 0, 2, 1, 0, 1, 2, 0, 1, 2, 1, recalled ? 4 : 3], savedMessage: null, takenTotal: recalled ? 28 : 27, activities },
  }
}
export const connection: Conn = { local: Object.fromEntries(supported.filter(source => !source.viaExtension).map(source => [source.id, { save: true, take: source.id !== 'qwen-work' }])), plugin: 'paired', pro: true, entitlementKnown: true, model: false, opened: true, setupDone: true, tryClosed: true }
const noop = (): void => {}
export const actions: ConnectionActions = { setSaving: noop, enableAllSaving: noop, startPairing: noop, cancelPairing: noop, disconnectPlugin: noop, configureModel: noop, setTaking: noop, enableTaking: noop, createRemoteToken: async () => { throw new Error('unavailable') }, revokeRemote: noop, markOpened: noop, completeSetup: noop, skipPlugin: noop, closeTry: noop, help: noop }
export const settingsActions: SettingsActions = { signIn: () => '', openDirectory: async () => {}, signOut: async () => ({ ok: true }), checkUpdate: () => false, submitCloudSyncInterest: noop }
