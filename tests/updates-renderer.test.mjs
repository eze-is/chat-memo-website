import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { render } = require('../updates-renderer.js');
const { updates } = JSON.parse(fs.readFileSync(path.join(root, 'updates-data.json'), 'utf8'));

test('四语共用时间线版式，版本与分类数量稳定', () => {
    for (const locale of ['zh-CN', 'en', 'ja', 'es']) {
        const catalog = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'));
        const html = render(updates, locale, { ...catalog.common, ...catalog.updates });
        assert.equal((html.match(/class="timeline-item"/g) || []).length, updates.length, locale);
        assert.ok(html.includes(updates[0].summary[locale]), locale);
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
    const html = render(sample, 'es', { 'tag-new': 'Novedades' });
    assert.ok(html.includes('English &amp; safe'));
    assert.ok(html.includes('v1 &lt;test&gt;'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&quot;safe&quot;'));
    assert.ok(html.includes('Novedades'));
    assert.equal(JSON.stringify(sample), before);
});
