// 官网版本说明由静态生成器统一渲染，内容以各产品的发布记录为准。
'use strict';

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function localized(value, locale) {
    if (typeof value === 'string') return value;
    return value?.[locale] || value?.en || '';
}

function renderFeature(feature, locale) {
    const title = escapeHtml(localized(feature.title, locale));
    const paragraphs = localized(feature.description, locale).split('\n\n').map(paragraph =>
        `<p class="feature-description">${escapeHtml(paragraph)}</p>`).join('\n                            ');
    const images = (feature.images ?? []).filter(image => /^\/resource\/updates\/[a-z0-9./-]+\.(?:png|webp)$/.test(image.src));
    const figures = images.map(image =>
        `<a class="update-image" href="${escapeHtml(image.src)}" target="_blank" rel="noopener"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(localized(image.alt, locale))}" width="${escapeHtml(image.width)}" height="${escapeHtml(image.height)}" loading="lazy"></a>`
    ).join('');
    const media = images.length > 1 ? `<div class="update-images">${figures}</div>` : figures;
    const download = localized(feature.desktopDownload, locale);
    const action = download
        ? `<a class="update-download" href="/${locale}/downloads" data-desktop-download-primary>${escapeHtml(download)}</a>`
        : '';
    return `
                        <div class="feature-item">
                            ${title ? `<h3 class="feature-title">${title}</h3>` : ''}
                            ${paragraphs}
                            ${action}${media}
                        </div>
                    `;
}

function renderUpdate(update, locale) {
    const features = update.features.map(feature => renderFeature(feature, locale)).join('');
    return `
            <div class="timeline-item">
                <div class="update-card">
                    <!-- 版本头部 -->
                    <div class="flex items-start justify-between mb-6">
                        <div class="flex-1">
                            <h2 class="version-title">${escapeHtml(update.version)}</h2>
                            ${update.summary ? `<p class="page-subtitle mb-0">${escapeHtml(localized(update.summary, locale))}</p>` : ''}
                        </div>
                        <div class="flex-shrink-0 ml-4">
                            <span class="update-date">${escapeHtml(localized(update.date, locale))}</span>
                        </div>
                    </div>

                    <div class="update-article">
                        ${features}
                    </div>
                </div>
            </div>
        `;
}

function render(data, locale, messages = {}) {
    // updates 仍由插件发版工具写入，两端允许使用同一版本号。
    const products = [
        { id: 'updates-app', name: messages['updates-app'] || 'Desktop App', updates: data.desktopUpdates ?? [] },
        { id: 'updates-extension', name: messages['updates-extension'] || 'Browser Extension', updates: data.updates }
    ];
    const sections = products.map((product) => {
        if (!Array.isArray(product.updates)) throw new TypeError(`${product.id} must be an array`);
        const content = product.updates.length
            ? product.updates.map((update) => renderUpdate(update, locale)).join('')
            : `<p class="product-updates-empty">${escapeHtml(messages['updates-empty'] || 'No release notes yet.')}</p>`;
        return `<section id="${product.id}" class="product-updates" aria-labelledby="${product.id}-title">
            <h2 id="${product.id}-title" class="product-updates-title">${escapeHtml(product.name)}</h2>
            ${content}
        </section>`;
    }).join('');
    return `<div class="updates-products" role="navigation" aria-label="${escapeHtml(messages['updates-products'] || 'Products')}">
        ${products.map(({ id, name }) => `<a id="${id}-tab" href="#${id}">${escapeHtml(name)}</a>`).join('')}
    </div>${sections}`;
}

module.exports = { render };
