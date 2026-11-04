import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { init, marketFromTrace } = createRequire(import.meta.url)('../pricing-region.js');

function view() {
    const loading = { hidden: false }, error = { hidden: true };
    const offers = ['cn', 'global'].map(market => ({ dataset: { priceMarket: market }, hidden: true }));
    const retry = { addEventListener(_event, handler) { this.click = handler; } };
    const root = { dataset: {}, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; },
        querySelector(selector) { return { '[data-price-loading]': loading, '[data-price-error]': error, '[data-price-retry]': retry }[selector]; },
        querySelectorAll() { return offers; } };
    return { document: { querySelector: () => root }, root, loading, error, offers, retry };
}

test('网络国家决定唯一报价，不把边缘机房当作访客地区', () => {
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
