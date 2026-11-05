// 界面语言与出口地区只决定公开报价，与 App 同规则，不产生账号地区或购买资格。
(function () {
    'use strict';
    function isChinese(language) { return typeof language === 'string' && /^zh(?:-|$)/i.test(language); }
    function marketFromTrace(trace, language) {
        if (isChinese(language)) return 'cn';
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
                const language = document.documentElement.lang;
                let trace = '';
                // 中文界面已确定人民币报价；其他语言仅消费Cloudflare的loc，不保存IP或trace。
                if (!isChinese(language)) {
                    const response = await request('/cdn-cgi/trace', {
                        cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000)
                    });
                    if (!response.ok) throw new Error('Country request failed');
                    trace = await response.text();
                }
                const market = marketFromTrace(trace, language);
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
