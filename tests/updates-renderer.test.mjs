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

test('四语两端的所有版本共用分段版式，保留每一条说明和已有配图', () => {
    for (const locale of ['zh-CN', 'en', 'ja', 'es']) {
        const catalog = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'));
        const html = render(data, locale, { ...catalog.common, ...catalog.updates });
        assert.equal((html.match(/class="timeline-item"/g) || []).length, updates.length + data.desktopUpdates.length, locale);
        const newest = updates[0];
        assert.ok(html.includes(escapeHtml((newest.summary ?? newest.features[0].title)[locale])), locale);
        const releases = [...data.desktopUpdates, ...updates];
        const features = releases.flatMap(release => release.features);
        assert.equal((html.match(/class="update-article"/g) || []).length, releases.length, locale);
        assert.equal((html.match(/class="feature-item"/g) || []).length, features.length, locale);
        assert.equal((html.match(/<h3 class="feature-title">/g) || []).length, features.filter(feature => feature.title).length, locale);
        assert.doesNotMatch(html, /<p class="feature-description">\s*<\/p>/);
        assert.equal((html.match(/<img /g) || []).length, features.flatMap(feature => feature.images ?? []).length, locale);
        assert.doesNotMatch(html, /class="feature-group/);
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
    const html = render({ updates: sample, desktopUpdates: [] }, 'es');
    assert.ok(html.includes('English &amp; safe'));
    assert.ok(html.includes('v1 &lt;test&gt;'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&quot;safe&quot;'));
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
    assert.doesNotMatch(html, /<img |class="update-images?"/);
});

test('整幅截图按原顺序逐张展示', () => {
    const images = ['conversation', 'formula'].map(name => ({
        src: `/resource/updates/${name}.png`, alt: name, fullWidth: true
    }));
    const entry = { version: 'v2.1.2', features: [{ images }] };
    const html = render({ updates: [entry] }, 'en');
    assert.doesNotMatch(html, /class="update-images"/);
    assert.equal((html.match(/class="update-image"/g) || []).length, 2);
    assert.ok(html.indexOf('conversation.png') < html.indexOf('formula.png'));
});

test('长版更新说明保留段落和顺序，配图及下载入口随对应段落展示', () => {
    const entry = {
        version: 'v2.1.0',
        features: [
            { type: 'improvement', title: '先读我', description: '第一段\n\n第二段' },
            { type: 'new', title: '桌面端', description: '说明', desktopDownload: '下载',
                images: [{ src: '/resource/updates/2.1.0/example.png', alt: '前后对照', width: 640, height: 320 }] },
            { type: 'new', title: '导入', description: '历史记录', images: [
                { src: '/resource/updates/2.1.0/records.png', alt: '导入后的记录' },
                { src: '/resource/updates/2.1.0/import.png', alt: '导入入口' },
            ] },
        ],
    };
    const html = render({ updates: [entry] }, 'zh-CN');
    assert.ok(html.indexOf('先读我') < html.indexOf('桌面端'));
    assert.ok(html.includes('<p class="feature-description">第一段</p>'));
    assert.ok(html.includes('<p class="feature-description">第二段</p>'));
    assert.ok(html.includes('alt="前后对照" width="640" height="320"'));
    assert.ok(html.includes('href="/zh-CN/downloads" data-desktop-download-primary>下载</a>'));
    assert.ok(html.indexOf('data-desktop-download-primary') < html.indexOf('class="update-image"'));
    assert.match(html, /class="update-images".*导入后的记录.*导入入口/);
    assert.doesNotMatch(html, /class="group-title"/);
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
