#!/usr/bin/env node
// 双语法律原文各自拥有正文；HTML 是可重建的静态阅读页，语言路由复用官网。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://chatmemo.ai';
const check = process.argv.includes('--check');
const routeContext = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, 'site-i18n.js'), 'utf8'), routeContext);
const { pathFor } = routeContext.window.SiteI18n;
const locales = {
    'zh-CN': {
        name: '简体中文', versionLabel: '版本：', effectiveLabel: '生效日期：', languageLabel: '语言',
        skip: '跳到正文', description: '中文审阅稿，尚未正式生效。', titles: { privacy: '隐私政策', terms: '用户协议' },
    },
    en: {
        name: 'English', versionLabel: 'Version: ', effectiveLabel: 'Effective date: ', languageLabel: 'Language',
        skip: 'Skip to content', description: 'Draft for review; not yet in effect.', titles: { privacy: 'Privacy Policy', terms: 'Terms of Service' },
    },
};
// 发布后不修改旧原文；修订时新增版本并切换对应指针。
const documents = [
    { key: 'privacy', locale: 'zh-CN', version: '2026-11-04.1', sha256: 'e24cb30d55053339f6c98439854efab178595c3122ece512528d3306e45bf947' },
    { key: 'terms', locale: 'zh-CN', version: '2026-11-04.1', sha256: '2f40b83c43a19979ef237942b6bccdb7ff638e6e6ba2980a22c160b5f02f980d' },
    { key: 'privacy', locale: 'en', version: '2026-11-04.1', sha256: '7c34f217ac8502f51a5af78028dd06d523f807ec5a4f91509afa16e488671696' },
    { key: 'terms', locale: 'en', version: '2026-11-04.1', sha256: '38d64d93bd1c21567d9e8c3310e96630610100d9647f82065a60cd69844a5738' },
];

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const inline = value => escape(value).replace(/\beze@chatmemo\.ai\b/g, '<!--email_off--><a href="mailto:eze@chatmemo.ai">eze@chatmemo.ai</a><!--/email_off-->');

function readDocument(spec) {
    const copy = locales[spec.locale];
    const title = copy.titles[spec.key];
    const sourcePath = `desktop/legal/versions/${spec.locale}/${spec.version}/${spec.key}.md`;
    const source = readFileSync(resolve(root, sourcePath), 'utf8');
    const sha256 = createHash('sha256').update(source).digest('hex');
    if (sha256 !== spec.sha256) throw new Error(`版本正文发生变化：${sourcePath}。请发布新版本，不覆盖旧稿。`);
    const lines = source.trim().split(/\r?\n/);
    if (lines.shift() !== `# ${title}`) throw new Error(`标题不一致：${sourcePath}`);
    const version = lines.find(line => line.startsWith(copy.versionLabel))?.slice(copy.versionLabel.length);
    const effective = lines.find(line => line.startsWith(copy.effectiveLabel))?.slice(copy.effectiveLabel.length);
    if (version !== `Draft · ${spec.locale} · ${spec.version}` || !effective) throw new Error(`版本元信息不完整：${sourcePath}`);
    const blocks = lines.filter(line => !line.startsWith(copy.versionLabel) && !line.startsWith(copy.effectiveLabel)).join('\n').trim().split(/\n\s*\n/);
    let sectionCount = 0;
    const body = blocks.map(block => {
        if (/^(?:[一二三四五六七八九十]+、|\d+\. )[^\n]+$/.test(block)) {
            const id = `section-${++sectionCount}`;
            return `${sectionCount > 1 ? '</section>\n' : ''}<section aria-labelledby="${id}"><h2 id="${id}">${escape(block)}</h2>`;
        }
        if (block.split('\n').every(line => line.startsWith('- '))) {
            return `<ul>${block.split('\n').map(line => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
        }
        return `<p>${inline(block.replaceAll('\n', ' '))}</p>`;
    }).join('\n') + (sectionCount ? '\n</section>' : '');
    if (sectionCount !== 5) throw new Error(`法律文档应有五部分：${sourcePath}`);
    return { ...spec, copy, title, versionLabel: version, effective, body };
}

function documentPage(doc) {
    const { copy, locale, key } = doc;
    const page = `desktop/${key}`;
    const canonical = pathFor(locale, page);
    return `<!doctype html>
<html lang="${locale}" data-lang="${locale}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(doc.title)} · Chat Memo Desktop</title>
    <meta name="description" content="Chat Memo Desktop · ${escape(doc.title)}. ${copy.description}">
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="${origin}${canonical}">
    ${Object.keys(locales).map(other => `<link rel="alternate" hreflang="${other}" href="${origin}${pathFor(other, page)}">`).join('\n    ')}
    <link rel="alternate" hreflang="x-default" href="${origin}/${page}">
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="/desktop/legal.css">
</head>
<body>
    <a class="skip-link" href="#main">${copy.skip}</a>
    <header class="site-header">
        <a class="brand" href="${pathFor(locale, 'home')}"><img src="/resource/icons/logo.png" width="32" height="32" alt="">Chat Memo</a>
        <nav class="language-links" aria-label="${copy.languageLabel}">${Object.entries(locales).map(([other, label]) => `<a href="${pathFor(other, page)}" lang="${other}" hreflang="${other}" data-site-locale-option="${other}"${other === locale ? ' aria-current="true"' : ''}>${label.name}</a>`).join('')}</nav>
    </header>
    <main id="main">
        <article data-document="${key}" data-source-sha256="${doc.sha256}">
            <header class="document-header">
                <h1>${doc.title}</h1>
                <p>${copy.versionLabel}${escape(doc.versionLabel)}<br>${copy.effectiveLabel}${escape(doc.effective)}</p>
            </header>
            <div class="document-body">${doc.body}</div>
        </article>
    </main>
    <script src="/site-i18n.js"></script>
    <script>SiteI18n.init('${page}');</script>
</body>
</html>
`;
}

const outputs = new Map();
for (const doc of documents.map(readDocument)) {
    outputs.set(`${pathFor(doc.locale, `desktop/${doc.key}`).slice(1)}.html`, documentPage(doc));
    // 无语言的旧地址与官网规则一致：英文静态兜底，脚本按明确选择／官网偏好／浏览器语言导航。
    if (doc.locale === 'en') outputs.set(`desktop/${doc.key}.html`, documentPage(doc));
}
let mismatch = false;
for (const [name, content] of outputs) {
    const target = resolve(root, name);
    if (check) {
        let current;
        try { current = readFileSync(target, 'utf8'); } catch { current = null; }
        if (current !== content) { console.error(`静态法律页需要更新：${name}`); mismatch = true; }
    } else {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content);
    }
}
if (mismatch) process.exitCode = 1;
else console.log(`${check ? '已核对' : '已生成'} ${outputs.size} 个桌面版法律静态页面。`);
