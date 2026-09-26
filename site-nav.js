// 导航栏的两个弹出区域由同一处管理，避免在窄屏上相互遮挡。
(function () {
    'use strict';

    function init() {
        const header = document.querySelector('#navbar-container header');
        if (!header || header.dataset.siteNavBound === 'true') return;

        const mobileTrigger = header.querySelector('#mobile-menu-button');
        const mobilePanel = header.querySelector('#mobile-menu');
        const localeMenu = header.querySelector('[data-site-locale-menu]');
        const localeTrigger = localeMenu?.querySelector('[data-site-locale-trigger]');
        const localePanel = localeMenu?.querySelector('[data-site-locale-options]');
        if (!mobileTrigger || !mobilePanel || !localeTrigger || !localePanel) return;
        header.dataset.siteNavBound = 'true';

        const mobileIcon = mobileTrigger.querySelector('path');
        function setMobileOpen(open) {
            mobilePanel.classList.toggle('hidden', !open);
            mobileTrigger.setAttribute('aria-expanded', String(open));
            mobileIcon?.setAttribute('d', open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16');
        }

        function setLocaleOpen(open) {
            localePanel.hidden = !open;
            localeTrigger.setAttribute('aria-expanded', String(open));
        }

        mobileTrigger.addEventListener('click', () => {
            const open = mobilePanel.classList.contains('hidden');
            setLocaleOpen(false);
            setMobileOpen(open);
        });
        localeTrigger.addEventListener('click', () => {
            const open = localePanel.hidden;
            setMobileOpen(false);
            setLocaleOpen(open);
        });
        mobilePanel.addEventListener('click', (event) => {
            if (event.target.closest('a')) setMobileOpen(false);
        });
        localeMenu.querySelectorAll('[data-site-locale-option]').forEach((option) => {
            option.addEventListener('click', () => {
                try {
                    window.SiteI18n.choose(option.dataset.siteLocaleOption);
                } catch (error) {
                    console.error('切换官网语言失败:', error);
                    setLocaleOpen(false);
                }
            });
        });
        document.addEventListener('click', (event) => {
            if (!localeMenu.contains(event.target)) setLocaleOpen(false);
            if (!mobileTrigger.contains(event.target) && !mobilePanel.contains(event.target)) setMobileOpen(false);
        });
        header.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (!localePanel.hidden) {
                setLocaleOpen(false);
                localeTrigger.focus();
            } else if (!mobilePanel.classList.contains('hidden')) {
                setMobileOpen(false);
                mobileTrigger.focus();
            }
        });
        localeMenu.addEventListener('focusout', (event) => {
            if (!localeMenu.contains(event.relatedTarget)) setLocaleOpen(false);
        });
        header.addEventListener('focusout', (event) => {
            if (!header.contains(event.relatedTarget)) setMobileOpen(false);
        });
    }

    window.SiteNav = { init };
})();
