import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseFragment } from 'parse5';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { render } = require('../updates-renderer.js');
const data = JSON.parse(fs.readFileSync(path.join(root, 'updates-data.json'), 'utf8'));
const { updates } = data;
// 渲染输出是转义后的 HTML；摘要可能含撇号等字符（如 "Claude's"），比对前按同一规则转义
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

test('四语共用时间线版式，版本与分类数量稳定', () => {
    for (const locale of ['zh-CN', 'en', 'ja', 'es']) {
        const catalog = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'));
        const html = render(data, locale, { ...catalog.common, ...catalog.updates });
        assert.equal((html.match(/class="timeline-item"/g) || []).length, updates.length + data.desktopUpdates.length, locale);
        assert.ok(html.includes(escapeHtml(updates[0].summary[locale])), locale);
        assert.ok(html.includes(catalog.updates['tag-new']), locale);
        assert.ok(html.includes(catalog.updates['tag-improvement']), locale);
        assert.ok(html.includes(catalog.updates['tag-fix']), locale);
    }
});

test('缺译仅回退英文，数据作为文本转义且渲染不修改输入', () => {
    const sample = [{
        version: 'v1 <test>',
        summary: { en: 'English & safe' },
        date: { en: 'Today' },
        features: [{ type: 'new', title: { en: '<script>' }, description: { en: '"safe"' } }]
    }];
    const before = JSON.stringify(sample);
    const html = render({ updates: sample, desktopUpdates: [] }, 'es', { 'tag-new': 'Novedades' });
    assert.ok(html.includes('English &amp; safe'));
    assert.ok(html.includes('v1 &lt;test&gt;'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&quot;safe&quot;'));
    assert.ok(html.includes('Novedades'));
    assert.ok(html.includes('No release notes yet.'));
    assert.equal(JSON.stringify(sample), before);
});

test('按原文展示更新说明时不补写摘要、小标题或空占位', () => {
    const app = {
        version: 'v1.0.9', date: { en: 'November 13, 2026' },
        features: [{ type: 'new', description: { en: 'The approved release note.' } }]
    };
    const html = render({ desktopUpdates: [app], updates: [] }, 'en');
    assert.ok(html.includes('The approved release note.'));
    assert.ok(html.includes('November 13, 2026'));
    assert.ok(!html.includes('class="page-subtitle mb-0"'));
    assert.ok(!html.includes('class="feature-title"'));
});


test('同名版本按产品隔离，四语首响应保留两个产品入口', () => {
    const app = { ...updates[0], summary: { en: 'App release' } };
    const extension = { ...updates[0], summary: { en: 'Extension release' } };
    const html = render({ desktopUpdates: [app], updates: [extension] }, 'en');
    const sections = parseFragment(html).childNodes.filter(node => node.tagName === 'section');
    const text = node => node.value || (node.childNodes || []).map(text).join('');
    assert.equal(sections.length, 2);
    assert.ok(text(sections[0]).includes('App release'));
    assert.ok(!text(sections[0]).includes('Extension release'));
    assert.ok(text(sections[1]).includes('Extension release'));
    assert.ok(!text(sections[1]).includes('App release'));
    for (const locale of ['zh-CN', 'en', 'ja', 'es']) {
        const catalog = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'));
        const rendered = render(data, locale, catalog.updates);
        const page = fs.readFileSync(path.join(root, locale, 'updates.html'), 'utf8');
        for (const key of ['updates-app', 'updates-extension']) {
            assert.ok(rendered.includes(catalog.updates[key]), locale);
            assert.ok(page.includes(catalog.updates[key]), locale);
        }
        for (const product of ['app', 'extension']) {
            assert.ok(page.includes(`href="#updates-${product}"`), locale);
            assert.ok(page.includes(`id="updates-${product}"`), locale);
        }
    }
});
