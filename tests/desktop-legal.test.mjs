import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, cpSync, appendFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'parse5';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function all(node, predicate) {
    return [...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap(child => all(child, predicate))];
}
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const text = node => {
    if (node.nodeName === '#text') return node.value;
    const value = (node.childNodes || []).map(text).join('');
    return ['p', 'h2', 'li'].includes(node.tagName) ? `${value}\n` : value;
};
const normalized = value => value.replace(/\s+/g, ' ').trim();
const specs = [['privacy', '2026-11-04.1'], ['terms', '2026-11-04.1']];

test('两份阅读页完整包含已确认的静态正文，不依赖脚本加载', () => {
    for (const [key, version] of specs) {
        const source = readFileSync(join(root, `desktop/legal/versions/zh-CN/${version}/${key}.md`), 'utf8');
        const expected = normalized(source.split('\n').filter(line => !line.startsWith('# ') && !line.startsWith('版本：') && !line.startsWith('生效日期：')).map(line => line.replace(/^- /, '')).join(' '));
        for (const path of [`desktop/${key}.html`]) {
            const html = readFileSync(join(root, path), 'utf8');
            const document = parse(html);
            const body = all(document, node => (attr(node, 'class') || '').split(' ').includes('document-body'))[0];
            assert.equal(normalized(text(body)), expected, path);
            assert.equal(all(document, node => node.tagName === 'h1').length, 1, path);
            assert.equal(all(document, node => node.tagName === 'h2').length, 5, path);
            assert.equal(all(document, node => node.tagName === 'script').length, 0, path);
            assert.equal(attr(all(document, node => node.tagName === 'html')[0], 'lang'), 'zh-CN');
            assert.equal(attr(all(document, node => node.tagName === 'meta' && attr(node, 'name') === 'robots')[0], 'content'), 'noindex, follow');
            assert.ok(text(document).includes('尚未正式生效'), path);
        }
    }
});

test('阅读页仅保留正文、官网品牌链接与联系邮箱', () => {
    for (const name of ['privacy.html', 'terms.html']) {
        const document = parse(readFileSync(join(root, 'desktop', name), 'utf8'));
        assert.deepEqual(all(document, node => node.tagName === 'a').map(node => attr(node, 'href')), ['#main', '/', 'mailto:eze@chatmemo.ai']);
        assert.equal(all(document, node => attr(node, 'download') !== undefined).length, 0);
        const ids = new Set(all(document, node => attr(node, 'id')).map(node => attr(node, 'id')));
        for (const link of all(document, node => node.tagName === 'a' || (node.tagName === 'link' && attr(node, 'rel') === 'stylesheet'))) {
            const href = attr(link, 'href');
            if (href.startsWith('#')) assert.ok(ids.has(href.slice(1)), href);
            else if (href.startsWith('/desktop/')) {
                const base = join(root, href);
                assert.ok([base, `${base}.html`, join(base, 'index.html')].some(existsSync), href);
            }
        }
        const stylesheets = all(document, node => node.tagName === 'link' && attr(node, 'rel') === 'stylesheet');
        assert.deepEqual(stylesheets.map(node => attr(node, 'href')), ['/desktop/legal.css']);
    }
});

test('同一版本的正文被修改时拒绝覆盖生成，要求增加版本', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'chatmemo-legal-'));
    try {
        mkdirSync(join(temporary, 'scripts'));
        cpSync(join(root, 'scripts/build-desktop-legal.mjs'), join(temporary, 'scripts/build-desktop-legal.mjs'));
        cpSync(join(root, 'desktop/legal/versions'), join(temporary, 'desktop/legal/versions'), { recursive: true });
        appendFileSync(join(temporary, 'desktop/legal/versions/zh-CN/2026-11-04.1/privacy.md'), '\n发生变更\n');
        const result = spawnSync(process.execPath, ['scripts/build-desktop-legal.mjs'], { cwd: temporary, encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /发布新版本，不覆盖旧稿/);
        assert.equal(existsSync(join(temporary, 'desktop/privacy.html')), false);
    } finally { rmSync(temporary, { recursive: true, force: true }); }
});
