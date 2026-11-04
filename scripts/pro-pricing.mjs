// 价格和已交付权益只读生产公共目录；官网不维护另一份销售配置。
export const catalogUrl = 'https://api.chatmemo.ai/public-config/pro-presentation.v1.json';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function validateCatalog(catalog) {
    if (catalog?.schemaVersion !== 1 || typeof catalog.contentVersion !== 'string' || !catalog.contentVersion.trim()
        || catalog.offer?.id !== 'pro-annual' || catalog.offer.product !== 'pro'
        || catalog.offer.duration?.unit !== 'calendar-year' || catalog.offer.duration.count !== 1) {
        throw new Error('Unsupported public Pro catalog; review pricing before publishing.');
    }
    for (const [market, currency] of [['cn', 'CNY'], ['global', 'USD']]) {
        const prices = catalog.offer.prices?.filter(value => value.market === market);
        if (prices?.length !== 1 || prices[0].currency !== currency || !Number.isSafeInteger(prices[0].amount) || prices[0].amount <= 0) {
            throw new Error(`Invalid public price: ${market}`);
        }
    }
    if (!Array.isArray(catalog.plans?.features) || !catalog.plans.features.length) throw new Error('Missing public features');
    const ids = new Set();
    for (const feature of catalog.plans.features) {
        if (!feature.id || ids.has(feature.id) || !['available', 'unavailable', 'planned'].includes(feature.free)
            || !['available', 'unavailable', 'planned'].includes(feature.pro)) throw new Error('Invalid public feature');
        ids.add(feature.id);
    }
    return catalog;
}

export async function loadCatalog() {
    const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(15000), cache: 'no-cache' });
    if (!response.ok) throw new Error(`Public Pro catalog unavailable: ${response.status}`);
    return validateCatalog(await response.json());
}

export function pricingMarkup(catalog, copy, locale) {
    validateCatalog(catalog);
    const t = key => {
        if (!copy[key]) throw new Error(`Missing pricing translation: ${locale}.${key}`);
        return escape(copy[key]);
    };
    const price = market => {
        const value = catalog.offer.prices.find(value => value.market === market);
        const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value.amount / 100);
        return `<span class="price-amount">${value.currency === 'CNY' ? 'CNY ' : 'US$'}${number}</span><span class="price-period">${t('per-year')}</span>`;
    };
    const cn = catalog.offer.prices.find(value => value.market === 'cn');
    const mark = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>';
    const features = pro => catalog.plans.features.filter(feature => (pro ? feature.pro : feature.free) === 'available')
        .map(feature => `<li${pro && feature.free !== 'available' ? ' class="plan-gain"' : ''}>${mark}<span>${t(`feature-${feature.id}`)}</span></li>`).join('');
    return `<div class="plan-comparison" role="group" aria-label="${t('comparison')}" data-catalog-version="${escape(catalog.contentVersion)}">
        <article class="plan-card plan-free" aria-labelledby="free-plan-title">
            <h2 id="free-plan-title">${t('free')}</h2><p class="plan-description">${t('free-description')}</p>
            <div class="plan-price"><span class="price-amount">${t('free-price')}</span></div>
            <ul class="plan-features">${features(false)}</ul>
        </article>
        <article class="plan-card plan-pro" aria-labelledby="pro-plan-title">
            <h2 id="pro-plan-title">Pro</h2><p class="plan-description">${t('pro-description')}</p>
            <div class="region-price" data-region-price aria-live="polite" aria-busy="true">
                <p class="price-status" data-price-loading data-key="price-loading">${t('price-loading')}</p>
                <div data-price-market="cn" hidden>${cn.standardAmount > cn.amount ? `<p class="early-bird">${t('early-bird')}</p>` : ''}<div class="plan-price">${price('cn')}</div></div>
                <div data-price-market="global" hidden><div class="plan-price">${price('global')}</div></div>
                <div class="price-failure" data-price-error hidden><p data-key="price-error">${t('price-error')}</p><button type="button" data-price-retry data-key="price-retry">${t('price-retry')}</button></div>
                <noscript><style>[data-price-loading] { display: none !important; }</style><p class="price-status">${t('price-noscript')}</p></noscript>
            </div>
            <ul class="plan-features">${features(true)}</ul>
        </article>
    </div>`;
}
