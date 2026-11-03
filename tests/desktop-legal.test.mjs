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
const keys = ['privacy', 'terms'];
const locales = ['zh-CN', 'en'];

function parsePage(path) { return parse(readFileSync(join(root, path), 'utf8')); }

test('中英正文及中立入口首个HTML完整可读，语言和审阅状态准确', () => {
    for (const locale of locales) for (const key of keys) {
        const source = readFileSync(join(root, `desktop/legal/versions/${locale}/2026-11-04.1/${key}.md`), 'utf8');
        const expected = normalized(source.split('\n').filter(line => !/^(# |版本：|生效日期：|Version: |Effective date: )/.test(line)).map(line => line.replace(/^- /, '')).join(' '));
        const paths = [`${locale}/desktop/${key}.html`, ...(locale === 'en' ? [`desktop/${key}.html`] : [])];
        for (const path of paths) {
            const document = parsePage(path);
            const body = all(document, node => attr(node, 'class') === 'document-body')[0];
            assert.equal(normalized(text(body)), expected, path);
            assert.equal(all(document, node => node.tagName === 'h1').length, 1, path);
            assert.equal(all(document, node => node.tagName === 'h2').length, 5, path);
            assert.equal(attr(all(document, node => node.tagName === 'html')[0], 'lang'), locale);
            assert.equal(attr(all(document, node => node.tagName === 'meta' && attr(node, 'name') === 'robots')[0], 'content'), 'noindex, follow');
            assert.ok(text(document).includes(locale === 'en' ? 'not yet in effect' : '尚未正式生效'), path);
            const scripts = all(document, node => node.tagName === 'script');
            assert.deepEqual(scripts.map(node => attr(node, 'src')), ['/site-i18n.js', undefined]);
            assert.equal(text(scripts[1]), `SiteI18n.init('desktop/${key}');`);
            if (locale === 'en') assert.doesNotMatch(text(document).replaceAll('最小提示科技工作室', '').replaceAll('简体中文', ''), /[\u4e00-\u9fff]/, path);
        }
    }
});

test('中英互链及canonical指向同一文档，不提供未翻译语言或额外下载入口', () => {
    for (const locale of locales) for (const key of keys) {
        const document = parsePage(`${locale}/desktop/${key}.html`);
        const links = all(document, node => node.tagName === 'a');
        assert.deepEqual(links.map(node => attr(node, 'href')), ['#main', `/${locale}/`, `/zh-CN/desktop/${key}`, `/en/desktop/${key}`, 'mailto:eze@chatmemo.ai']);
        assert.equal(all(document, node => attr(node, 'download') !== undefined).length, 0);
        const languageLinks = links.filter(node => attr(node, 'data-site-locale-option'));
        assert.equal(languageLinks.filter(node => attr(node, 'aria-current') === 'true').length, 1);
        assert.equal(attr(languageLinks.find(node => attr(node, 'aria-current') === 'true'), 'lang'), locale);
        const canonical = all(document, node => node.tagName === 'link' && attr(node, 'rel') === 'canonical')[0];
        assert.equal(attr(canonical, 'href'), `https://chatmemo.ai/${locale}/desktop/${key}`);
        const alternates = all(document, node => node.tagName === 'link' && attr(node, 'rel') === 'alternate');
        assert.deepEqual(alternates.map(node => [attr(node, 'hreflang'), attr(node, 'href')]), [
            ['zh-CN', `https://chatmemo.ai/zh-CN/desktop/${key}`], ['en', `https://chatmemo.ai/en/desktop/${key}`], ['x-default', `https://chatmemo.ai/desktop/${key}`],
        ]);
        for (const target of languageLinks.map(node => attr(node, 'href'))) assert.ok(existsSync(join(root, `${target}.html`)), target);
        const stylesheets = all(document, node => node.tagName === 'link' && attr(node, 'rel') === 'stylesheet');
        assert.deepEqual(stylesheets.map(node => attr(node, 'href')), ['/desktop/legal.css']);
    }
});

test('任一语言同版本正文变化时拒绝覆盖生成', () => {
    for (const locale of locales) {
        const temporary = mkdtempSync(join(tmpdir(), 'chatmemo-legal-'));
        try {
            mkdirSync(join(temporary, 'scripts'));
            cpSync(join(root, 'scripts/build-desktop-legal.mjs'), join(temporary, 'scripts/build-desktop-legal.mjs'));
            cpSync(join(root, 'site-i18n.js'), join(temporary, 'site-i18n.js'));
            cpSync(join(root, 'desktop/legal/versions'), join(temporary, 'desktop/legal/versions'), { recursive: true });
            appendFileSync(join(temporary, `desktop/legal/versions/${locale}/2026-11-04.1/privacy.md`), '\n发生变更\n');
            const result = spawnSync(process.execPath, ['scripts/build-desktop-legal.mjs'], { cwd: temporary, encoding: 'utf8' });
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /发布新版本，不覆盖旧稿/);
            assert.equal(existsSync(join(temporary, 'desktop/privacy.html')), false);
        } finally { rmSync(temporary, { recursive: true, force: true }); }
    }
});
