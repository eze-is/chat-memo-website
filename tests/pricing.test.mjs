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
    plans: { features: [
        { id: 'save', free: 'available', pro: 'available' },
        { id: 'read', free: 'unavailable', pro: 'available' },
        { id: 'ask', free: 'unavailable', pro: 'planned' },
    ] },
});

test('定价从公共金额和交付状态派生，未来权益不混入已售功能', () => {
    const input = catalog();
    const html = pricingMarkup(input, copy, 'en');
    assert.match(html, /CNY 123\.45/);
    assert.match(html, /US\$67\.89/);
    assert.match(html, /test\.1/);
    assert.match(html, /Continue conversations[^<]+<\/th><td>.*Not included<\/td><td>.*Included/);
    assert.doesNotMatch(html, /AI Ask|feature-ask|planned/);
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
    assert.throws(() => pricingMarkup(catalog(), { ...copy, 'feature-read': '' }, 'en'), /Missing pricing translation/);
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
            assert.match(footer, /https:\/\/github.com\/eze-is\/Chat-Memo\/blob\/main\/PRIVACY_POLICY\.md/);
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
        assert.match(html, /<table data-catalog-version=/);
        assert.match(html, /US\$[0-9]/);
        assert.match(html, /CNY [0-9]/);
        assert.doesNotMatch(html, /fetch\([^)]*api\.chatmemo/);
        assert.doesNotMatch(html, /awaiting confirmation|待确认|確認中|pendiente de confirmación/);
        assert.ok(html.includes(copy['refund-description']) || locale !== 'en');
    }
    assert.equal(context.window.SiteI18n.routeInfo('/pricing.html').page, 'pricing');
});
