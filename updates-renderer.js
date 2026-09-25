// 更新记录的唯一渲染器：浏览器与静态页面生成器共用同一份版式。
(function (root) {
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
                            <h4 class="feature-title">${escapeHtml(localized(feature.title, locale))}</h4>
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
                            <p class="page-subtitle mb-0">${escapeHtml(localized(update.summary, locale))}</p>
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

    function render(updates, locale, messages = {}) {
        if (!Array.isArray(updates)) throw new TypeError('updates must be an array');
        return updates.map((update) => renderUpdate(update, locale, messages)).join('');
    }

    const api = { render };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.UpdatesRenderer = api;
})(typeof window !== 'undefined' ? window : null);
