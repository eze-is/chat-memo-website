import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { pricingMarkup, validateCatalog } from '../scripts/pro-pricing.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copy = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8')).pricing;
// 专用反例价格，避免测试以重复的生产价作为正确性依据。
const catalog = () => ({ schemaVersion: 1, contentVersion: 'test.1',
    offer: { id: 'pro-annual', product: 'pro', duration: { unit: 'calendar-year', count: 1 },
        prices: [{ market: 'cn', currency: 'CNY', amount: 12345 }, { market: 'global', currency: 'USD', amount: 6789 }] },
    plans: { title: 'Chat Memo Pro', free: { label: '免费', description: '存下各家 AI 的对话，搜得到' }, pro: { label: 'Pro', description: '打通你的 AI，互通上下文' }, features: [
        { id: 'save', icon: 'save', label: '存下各家 AI 的对话', free: 'available', pro: 'available' },
        { id: 'read', icon: 'read', label: '跨 AI、跨会话接续对话', free: 'unavailable', pro: 'available' },
        { id: 'ask', icon: 'ask', label: 'AI 问答', free: 'unavailable', pro: 'planned' },
    ] },
});

test('定价从公共金额和交付状态派生，计划中功能逐项标记且不使用已交付勾选', () => {
    const input = catalog();
    const html = pricingMarkup(input, copy, 'en');
    assert.match(html, /CNY 123\.45/);
    assert.match(html, /US\$67\.89/);
    assert.match(html, /test\.1/);
    assert.match(html, /class="plan-gain"/);
    assert.equal((html.match(/Continue conversations/g) || []).length, 1);
    const draft = html.match(/<li class="plan-draft">[\s\S]*?<\/li>/)?.[0];
    assert.ok(draft);
    assert.match(draft, /AI Ask/);
    assert.match(draft, /class="plan-draft-label">Planned/);
    assert.doesNotMatch(draft, /plan-status-check/);
    assert.ok(html.indexOf(draft) > html.indexOf('Continue conversations'));
    input.offer.prices[0].amount = 22222;
    assert.match(pricingMarkup(input, copy, 'en'), /CNY 222\.22/);
});

test('未知商品、缺失市场、重复价格或不完整译文均阻止发布', () => {
    const changed = catalog(); changed.offer.duration.count = 2;
    assert.throws(() => validateCatalog(changed), /Unsupported/);
    const missing = catalog(); missing.offer.prices.pop();
    assert.throws(() => validateCatalog(missing), /Invalid public price/);
    const duplicate = catalog(); duplicate.offer.prices.push(duplicate.offer.prices[0]);
    assert.throws(() => validateCatalog(duplicate), /Invalid public price/);
    assert.throws(() => pricingMarkup(catalog(), { ...copy, 'per-year': '' }, 'en'), /Missing pricing translation/);
});

test('所有现行营销页、法律页和404的静态页脚均可直接打开协议和定价', () => {
    const paths = ['index', 'welcome', 'updates', 'pricing'];
    for (const locale of ['en', 'zh-CN', 'ja', 'es']) {
        const legalLocale = locale === 'zh-CN' ? locale : 'en';
        for (const name of paths) {
            const html = fs.readFileSync(path.join(root, locale, `${name}.html`), 'utf8');
            const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0];
            assert.ok(footer, `${locale}/${name}`);
            for (const href of [`/${legalLocale}/desktop/terms`, `/${legalLocale}/desktop/privacy`, `/${locale}/pricing`]) {
                assert.ok(footer.includes(`href="${href}"`), `${locale}/${name}: ${href}`);
            }
            assert.doesNotMatch(footer, /https:\/\/github.com\/eze-is\/Chat-Memo\/blob\/main\/PRIVACY_POLICY\.md/);
        }
    }
    for (const locale of ['en', 'zh-CN']) for (const name of ['privacy', 'terms']) {
        const html = fs.readFileSync(path.join(root, locale, 'desktop', `${name}.html`), 'utf8');
        const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0];
        assert.ok(footer?.includes(`href="/${locale}/desktop/terms"`));
        assert.ok(footer?.includes(`href="/${locale}/pricing"`));
    }
    assert.match(fs.readFileSync(path.join(root, '404.html'), 'utf8'), /<footer>.*href="\/desktop\/terms"/);
});

test('定价四语稳定路由和中立入口交给既有语言路由解析', () => {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'site-i18n.js'), 'utf8'), context);
    for (const locale of ['en', 'zh-CN', 'ja', 'es']) {
        const route = context.window.SiteI18n.routeInfo(`/${locale}/pricing`);
        assert.equal(route.locale, locale); assert.equal(route.page, 'pricing');
        assert.equal(context.window.SiteI18n.pathFor(locale, 'pricing'), `/${locale}/pricing`);
        const html = fs.readFileSync(path.join(root, locale, 'pricing.html'), 'utf8');
        assert.match(html, /data-catalog-version=/);
        assert.match(html, /data-price-market="cn" hidden/);
        assert.match(html, /data-price-market="global" hidden/);
        assert.doesNotMatch(html, /Mainland China|中国大陆|中国本土|China continental/);
        assert.match(html, /US\$[0-9]/);
        assert.match(html, /CNY [0-9]/);
        assert.doesNotMatch(html, /fetch\([^)]*api\.chatmemo/);
        const pricing = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8')).pricing;
        assert.doesNotMatch(html, /data-key="(?:refund-title|refund-description|contact-label)"|aria-labelledby="refund-title"/);
        assert.ok(html.includes(pricing['availability-description']));
    }
    assert.equal(context.window.SiteI18n.routeInfo('/pricing.html').page, 'pricing');
});

test('功能状态沿用App：可用项显示勾选，未提供项显示横线', () => {
    const input = catalog();
    input.plans.features.find(feature => feature.id === 'ask').pro = 'available';
    input.plans.features.push({ id: 'memory', icon: 'memory', label: '定制记忆', free: 'unavailable', pro: 'unavailable' });
    const html = pricingMarkup(input, copy, 'en');
    assert.match(html, /AI Ask/);
    assert.doesNotMatch(html, /plan-draft/);
    assert.match(html, /plan-off/);
    assert.match(html, /Custom memory/);
    assert.match(pricingMarkup(catalog(), { ...copy, 'feature-ask': 'Wrong website copy' }, 'en'), /AI Ask/);
});

test('官网图标和译文读取App静态资源，中文文案直接读取公共目录', () => {
    const input = catalog();
    input.plans.features.find(feature => feature.id === 'read').label = '同一份公共功能文案';
    input.plans.pro.description = '同一份公共方案说明';
    const chinese = JSON.parse(fs.readFileSync(path.join(root, 'locales/zh-CN.json'), 'utf8')).pricing;
    const html = pricingMarkup(input, chinese, 'zh-CN');
    assert.match(html, /同一份公共功能文案/);
    assert.match(html, /同一份公共方案说明/);
    assert.match(html, /lucide-arrow-down-to-line/);
    assert.match(html, /lucide-arrow-up-from-line/);
    assert.match(html, /lucide-message-square-text/);
    assert.match(html, /计划中/);
    assert.doesNotMatch(html, /草拟/);
    const bad = catalog(); bad.plans.features[0].icon = 'unknown';
    assert.throws(() => pricingMarkup(bad, copy, 'en'), /Unknown App plan icon/);
});

test('国内早鸟标签位于金额右侧的同一价格行，海外不标早鸟', () => {
    const input = catalog(); input.offer.prices[0].standardAmount = 20000;
    const html = pricingMarkup(input, copy, 'en');
    const cn = html.match(/<div data-price-market="cn" hidden>([\s\S]*?)<div data-price-market="global"/)[1];
    assert.match(cn, /class="plan-price">[\s\S]*?price-period[\s\S]*?<small class="early-bird">Early bird<\/small>/);
    const global = html.match(/<div data-price-market="global" hidden>([\s\S]*?)<div class="price-failure"/)[1];
    assert.doesNotMatch(global, /early-bird/);
});
