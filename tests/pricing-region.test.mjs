import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { init, marketFromTrace } = createRequire(import.meta.url)('../pricing-region.js');

function view(language = 'en') {
    const loading = { hidden: false }, error = { hidden: true };
    const offers = ['cn', 'global'].map(market => ({ dataset: { priceMarket: market }, hidden: true }));
    const retry = { addEventListener(_event, handler) { this.click = handler; } };
    const root = { dataset: {}, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; },
        querySelector(selector) { return { '[data-price-loading]': loading, '[data-price-error]': error, '[data-price-retry]': retry }[selector]; },
        querySelectorAll() { return offers; } };
    return { document: { documentElement: { lang: language }, querySelector: () => root }, root, loading, error, offers, retry };
}

test('非中文界面按网络国家选价，不把边缘机房当作访客地区', () => {
    assert.equal(marketFromTrace('colo=NRT\nloc=CN\n'), 'cn');
    assert.equal(marketFromTrace('colo=HKG\nloc=JP\n'), 'global');
    for (const value of ['loc=XX', 'loc=ZZ', 'loc=T1', 'colo=CN', 'loc=CN\nloc=US', '<html>error</html>']) {
        assert.throws(() => marketFromTrace(value), /Country unavailable/);
    }
});

test('首次加载不闪现双价，CN和海外均只显示一档且不携带账号凭据', async () => {
    for (const country of ['CN', 'US', 'JP']) {
        const ui = view(); let resolveRequest;
        const ready = init(ui.document, (path, options) => {
            assert.equal(path, '/cdn-cgi/trace');
            assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
            return new Promise(resolve => { resolveRequest = resolve; });
        });
        assert.ok(ui.offers.every(offer => offer.hidden));
        assert.equal(ui.root.attributes['aria-busy'], 'true');
        resolveRequest({ ok: true, text: async () => `loc=${country}\n` });
        await ready;
        assert.deepEqual(ui.offers.filter(offer => !offer.hidden).map(offer => offer.dataset.priceMarket), [country === 'CN' ? 'cn' : 'global']);
        assert.equal(ui.root.attributes['aria-busy'], 'false');
        assert.equal(ui.error.hidden, true);
    }
});

test('识别失败保持无报价并明确反馈，用户重试可以恢复且不重复绑定', async () => {
    const ui = view(); let calls = 0;
    const request = async () => { calls++; return calls === 1 ? { ok: false } : { ok: true, text: async () => 'loc=CN' }; };
    await init(ui.document, request);
    assert.equal(ui.error.hidden, false);
    assert.ok(ui.offers.every(offer => offer.hidden));
    assert.equal(ui.root.dataset.market, undefined);
    assert.equal(init(ui.document, request), undefined);
    await ui.retry.click();
    assert.equal(calls, 2); assert.equal(ui.error.hidden, true);
    assert.deepEqual(ui.offers.filter(offer => !offer.hidden).map(offer => offer.dataset.priceMarket), ['cn']);
});

test('中文界面或CN出口显示人民币，其他已识别地区的非中文界面显示美元', () => {
    for (const [language, trace, expected] of [
        ['zh-CN', 'loc=CN', 'cn'], ['zh-CN', 'loc=JP', 'cn'], ['zh-CN', '', 'cn'],
        ['zh-CN', 'loc=XX', 'cn'], ['zh-TW', 'loc=US', 'cn'],
        ['en', 'loc=CN', 'cn'], ['ja', 'loc=CN', 'cn'], ['es', 'loc=CN', 'cn'],
        ['en', 'loc=US', 'global'], ['ja', 'loc=JP', 'global'], ['es', 'loc=ES', 'global']
    ]) assert.equal(marketFromTrace(trace, language), expected, `${language}/${trace}`);
});

test('中文静态页面立即只显示人民币，不依赖地区请求成功', async () => {
    const ui = view('zh-CN'); let calls = 0;
    await init(ui.document, async () => { calls++; throw new Error('Network unavailable'); });
    assert.equal(calls, 0);
    assert.equal(ui.root.dataset.market, 'cn');
    assert.deepEqual(ui.offers.filter(offer => !offer.hidden).map(offer => offer.dataset.priceMarket), ['cn']);
    assert.equal(ui.error.hidden, true);
    assert.equal(ui.loading.hidden, true);
    assert.equal(ui.root.attributes['aria-busy'], 'false');
});
