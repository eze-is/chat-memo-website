// 官网版本说明由静态生成器统一渲染，内容以各产品的发布记录为准。
'use strict';

const types = [
    { key: 'new', icon: '🚀', color: 'new', label: 'New Features' },
    { key: 'improvement', icon: '✨', color: 'improvement', label: 'Improvements' },
    { key: 'fix', icon: '🔧', color: 'fix', label: 'Bug Fixes' }
];

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function localized(value, locale) {
    if (typeof value === 'string') return value;
    return value?.[locale] || value?.en || '';
}

function renderUpdate(update, locale, messages) {
    const groups = types.map((type) => {
        const features = update.features.filter((feature) => feature.type === type.key);
        if (!features.length) return '';

        const featuresHtml = features.map((feature) => `
                        <div class="feature-item">
                            ${feature.title ? `<h4 class="feature-title">${escapeHtml(localized(feature.title, locale))}</h4>` : ''}
                            <p class="feature-description">${escapeHtml(localized(feature.description, locale))}</p>
                        </div>
                    `).join('');

        return `
                        <div class="feature-group mb-6">
                            <div class="flex items-center group-title">
                                <span class="group-icon">${type.icon}</span>
                                <h3 class="text-${type.color}">${escapeHtml(messages[`tag-${type.key}`] || type.label)}</h3>
                            </div>
                            <div class="space-y-3">
                                ${featuresHtml}
                            </div>
                        </div>
                    `;
    }).join('');

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

                    <!-- 分组功能列表 -->
                    <div class="space-y-5">
                        ${groups}
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
            ? product.updates.map((update) => renderUpdate(update, locale, messages)).join('')
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
