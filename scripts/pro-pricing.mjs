import { readFileSync } from 'node:fs';
const appPresentation = JSON.parse(readFileSync(new URL('../resource/pro-plan-presentation.json', import.meta.url), 'utf8'));
// 价格、功能及交付状态只读生产公共目录；官网不维护另一份销售配置。
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
    for (const plan of [catalog.plans.free, catalog.plans.pro]) {
        if (!plan || !plan.label?.trim() || !plan.description?.trim()) throw new Error('Missing public plan copy');
    }
    const ids = new Set();
    for (const feature of catalog.plans.features) {
        if (!feature.id || ids.has(feature.id) || !['available', 'unavailable', 'planned'].includes(feature.free)
            || !['available', 'unavailable', 'planned'].includes(feature.pro)) throw new Error('Invalid public feature');
        if (!appPresentation.icons[feature.icon]) throw new Error(`Unknown App plan icon: ${feature.icon}`);
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
    const ui = appPresentation.copy[locale];
    if (!ui) throw new Error(`Missing App plan locale: ${locale}`);
    // 中文直接消费与App相同的公共目录；其他语言复用App共享的语义ID翻译。
    const plans = { ...catalog.plans, free: ui.free ?? catalog.plans.free, pro: ui.pro ?? catalog.plans.pro };
    const features = pro => catalog.plans.features.filter(feature => pro || feature.free !== 'unavailable').map(feature => {
        const state = pro ? feature.pro : feature.free;
        const label = ui.features ? ui.features[feature.id] : feature.label;
        if (!label) throw new Error(`Missing App plan translation: ${locale}.${feature.id}`);
        const className = state === 'planned' ? 'plan-draft' : state === 'unavailable' ? 'plan-off' : pro && feature.free === 'unavailable' ? 'plan-gain' : '';
        const status = state === 'available'
            ? `<span class="plan-status-check" role="img" aria-label="${escape(ui.available)}">${appPresentation.check}</span>`
            : state === 'planned' ? `<small class="plan-draft-label">${escape(ui.planned)}</small>`
                : `<span class="plan-status-off" aria-label="${escape(ui.unavailable)}">—</span>`;
        return `<li${className ? ` class="${className}"` : ''}>${appPresentation.icons[feature.icon]}<span>${escape(label)}</span>${status}</li>`;
    }).join('');
    return `<div class="plan-comparison" role="group" aria-label="${escape(ui.comparison)}" data-catalog-version="${escape(catalog.contentVersion)}">
        <article class="plan-card plan-free" aria-labelledby="free-plan-title">
            <h2 id="free-plan-title">${escape(plans.free.label)}</h2><p class="plan-description">${escape(plans.free.description)}</p>
            <div class="plan-price"><span class="price-amount">${t('free-price')}</span></div>
            <ul class="plan-features">${features(false)}</ul>
        </article>
        <article class="plan-card plan-pro" aria-labelledby="pro-plan-title">
            <h2 id="pro-plan-title">${escape(plans.pro.label)}</h2><p class="plan-description">${escape(plans.pro.description)}</p>
            <div class="region-price" data-region-price aria-live="polite" aria-busy="true">
                <p class="price-status" data-price-loading data-key="price-loading">${t('price-loading')}</p>
                <div data-price-market="cn" hidden><div class="plan-price">${price('cn')}${cn.standardAmount > cn.amount ? `<small class="early-bird">${t('early-bird')}</small>` : ''}</div></div>
                <div data-price-market="global" hidden><div class="plan-price">${price('global')}</div></div>
                <div class="price-failure" data-price-error hidden><p data-key="price-error">${t('price-error')}</p><button type="button" data-price-retry data-key="price-retry">${t('price-retry')}</button></div>
                <noscript><style>[data-price-loading] { display: none !important; }</style><p class="price-status">${t('price-noscript')}</p></noscript>
            </div>
            <ul class="plan-features">${features(true)}</ul>
        </article>
    </div>`;
}
