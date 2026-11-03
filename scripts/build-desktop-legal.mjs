#!/usr/bin/env node
// 公开法律正文由版本化 Markdown 拥有；HTML 是可重建的静态阅读页。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://chatmemo.ai';
const check = process.argv.includes('--check');
// 发布新稿时添加新的版本文件并切换指针；不修改已发布版本。
const documents = [
    { key: 'privacy', title: '隐私政策', version: '2026-11-03.10', sha256: '18d9fd86b20f771f19d1202105f806eb12efef5b5b280f251e7bfecca46d86e2' },
    { key: 'terms', title: '用户协议', version: '2026-11-03.11', sha256: 'e6e5eadd119ccda5ce4135f2df5a175faacc3e470fbafcd4d08c14a9ad299627' },
];

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const inline = value => escape(value).replace(/\beze@chatmemo\.ai\b/g, '<a href="mailto:eze@chatmemo.ai">eze@chatmemo.ai</a>');

function readDocument(spec) {
    const sourcePath = `/desktop/legal/versions/zh-CN/${spec.version}/${spec.key}.md`;
    const source = readFileSync(resolve(root, `.${sourcePath}`), 'utf8');
    const sha256 = createHash('sha256').update(source).digest('hex');
    if (sha256 !== spec.sha256) throw new Error(`版本正文发生变化：${sourcePath}。请发布新版本，不覆盖旧稿。`);
    const lines = source.trim().split(/\r?\n/);
    const title = lines.shift()?.replace(/^# /, '');
    if (title !== spec.title) throw new Error(`标题不一致：${sourcePath}`);
    const version = lines.find(line => line.startsWith('版本：'))?.slice(3);
    const effective = lines.find(line => line.startsWith('生效日期：'))?.slice(5);
    if (version !== `Draft · zh-CN · ${spec.version}` || !effective) throw new Error(`版本元信息不完整：${sourcePath}`);
    const blocks = lines.filter(line => !line.startsWith('版本：') && !line.startsWith('生效日期：')).join('\n').trim().split(/\n\s*\n/);
    const sections = [];
    let inSection = false;
    const body = blocks.map(block => {
        if (/^[一二三四五六七八九十]+、[^\n]+$/.test(block)) {
            const id = `section-${sections.length + 1}`;
            sections.push({ id, title: block });
            const html = `${inSection ? '</section>\n' : ''}<section aria-labelledby="${id}"><h2 id="${id}">${escape(block)}</h2>`;
            inSection = true;
            return html;
        }
        if (block.split('\n').every(line => line.startsWith('- '))) {
            return `<ul>${block.split('\n').map(line => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
        }
        return `<p${block.startsWith('本稿供审阅') ? ' class="draft-note"' : ''}>${inline(block.replaceAll('\n', ' '))}</p>`;
    }).join('\n') + (inSection ? '\n</section>' : '');
    return { ...spec, sourcePath, versionLabel: version, effective, body, sections };
}

function frame({ title, path, content }) {
    return `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(title)} · Chat Memo Desktop</title>
    <meta name="description" content="Chat Memo 桌面版${escape(title)}。中文审阅稿，尚未正式生效。">
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="${origin}${path}">
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="/desktop/legal.css">
</head>
<body>
    <a class="skip-link" href="#main">跳到正文</a>
    <header class="site-header">
        <a class="brand" href="/"><img src="/resource/icons/logo.png" width="32" height="32" alt="">Chat Memo</a>
    </header>
    <main id="main">${content}</main>
</body>
</html>
`;
}

function documentPage(doc) {
    return frame({ title: doc.title, path: `/desktop/${doc.key}`, content: `
        <article data-document="${doc.key}" data-source-sha256="${doc.sha256}">
            <header class="document-header">
                <h1>${doc.title}</h1>
                <p>版本：${escape(doc.versionLabel)}<br>生效日期：${escape(doc.effective)}</p>
            </header>
            <div class="document-body">${doc.body}</div>
        </article>` });
}

const outputs = new Map(documents.map(readDocument).map(doc => [`desktop/${doc.key}.html`, documentPage(doc)]));

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
