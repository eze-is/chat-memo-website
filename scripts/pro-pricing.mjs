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
    const price = market => {
        const value = catalog.offer.prices.find(value => value.market === market);
        const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value.amount / 100);
        return `${value.currency === 'CNY' ? 'CNY ' : 'US$'}${number}`;
    };
    const t = key => {
        if (!copy[key]) throw new Error(`Missing pricing translation: ${locale}.${key}`);
        return escape(copy[key]);
    };
    const features = catalog.plans.features.filter(feature => feature.free === 'available' || feature.pro === 'available');
    const status = (value, plan) => `<span class="mobile-plan-label">${plan}: </span>${t(value === 'available' ? 'included' : 'not-included')}`;
    return `<table data-catalog-version="${escape(catalog.contentVersion)}">
        <caption class="sr-only">${t('comparison')}</caption>
        <thead><tr><td></td><th scope="col"><h2>${t('free')}</h2><p class="plan-price">${t('free-price')}</p><p>${t('free-description')}</p></th>
        <th scope="col"><h2>Pro</h2><p class="plan-price">${price('global')}<span>${t('per-year')}</span></p><p>${t('mainland')}: <span class="local-price">${price('cn')}${t('per-year')}</span></p><p>${t('pro-description')}</p></th></tr></thead>
        <tbody>${features.map(feature => `<tr><th scope="row">${t(`feature-${feature.id}`)}</th><td>${status(feature.free, t('free'))}</td><td>${status(feature.pro, 'Pro')}</td></tr>`).join('')}</tbody>
    </table>`;
}
