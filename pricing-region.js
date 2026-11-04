// 地区只决定当前网页展示哪一档公开价格，不产生账号地区或购买资格。
(function () {
    'use strict';
    function marketFromTrace(trace) {
        const countries = trace.split(/\r?\n/).filter(line => line.startsWith('loc='));
        if (countries.length !== 1) throw new Error('Country unavailable');
        const country = countries[0].slice(4).trim();
        if (!/^[A-Z]{2}$/.test(country) || ['XX', 'ZZ'].includes(country)) throw new Error('Country unavailable');
        return country === 'CN' ? 'cn' : 'global';
    }
    function init(document = window.document, request = window.fetch.bind(window)) {
        const root = document.querySelector('[data-region-price]');
        if (!root || root.dataset.bound) return;
        root.dataset.bound = 'true';
        const loading = root.querySelector('[data-price-loading]');
        const error = root.querySelector('[data-price-error]');
        const offers = root.querySelectorAll('[data-price-market]');
        let pending = false;
        async function load() {
            if (pending) return;
            pending = true;
            loading.hidden = false;
            error.hidden = true;
            offers.forEach(offer => { offer.hidden = true; });
            root.setAttribute('aria-busy', 'true');
            try {
                // 仅消费Cloudflare现有同源端点的loc；不保存、记录或转发完整trace和IP。
                const response = await request('/cdn-cgi/trace', {
                    cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000)
                });
                if (!response.ok) throw new Error('Country request failed');
                const market = marketFromTrace(await response.text());
                offers.forEach(offer => { offer.hidden = offer.dataset.priceMarket !== market; });
                root.dataset.market = market;
            } catch {
                delete root.dataset.market;
                error.hidden = false;
            } finally {
                loading.hidden = true;
                root.setAttribute('aria-busy', 'false');
                pending = false;
            }
        }
        root.querySelector('[data-price-retry]').addEventListener('click', load);
        return load();
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { marketFromTrace, init };
    else window.ChatMemoPricing = { init };
})();
