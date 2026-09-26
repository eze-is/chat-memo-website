// 官网语言规则只在这里解释；页面词条和版本记录各由自己的数据文件拥有。
(function () {
    'use strict';

    const supportedLocales = ['zh-CN', 'en', 'ja', 'es'];
    const catalogCache = new Map();
    let page = null;
    let locale = 'en';

    function routeInfo(pathname) {
        const localized = pathname.match(/^\/(zh-CN|en|ja|es)(?:\/(welcome|updates)(?:\.html)?)?\/?$/);
        if (localized) return { locale: localized[1], page: localized[2] || 'home' };
        const base = pathname.match(/^\/(welcome|updates)(?:\.html)?\/?$/);
        if (base) return { locale: null, page: base[1] };
        if (pathname === '/') return { locale: null, page: 'home' };
        return null;
    }

    function pathFor(targetLocale, targetPage) {
        const prefix = `/${targetLocale}`;
        return targetPage === 'home' ? `${prefix}/` : `${prefix}/${targetPage}`;
    }

    function normalize(candidate) {
        if (typeof candidate !== 'string') return null;
        const value = candidate.trim().replaceAll('_', '-').toLowerCase();
        if (value === 'zh' || value.startsWith('zh-')) return 'zh-CN';
        if (value === 'en' || value.startsWith('en-')) return 'en';
        if (value === 'ja' || value.startsWith('ja-')) return 'ja';
        if (value === 'es' || value.startsWith('es-')) return 'es';
        return null;
    }

    function detectInitialLocale() {
        const url = new URL(window.location.href);
        const route = routeInfo(url.pathname);
        if (route?.locale) return route.locale;
        const linkedLocale = normalize(url.searchParams.get('lang'));
        if (linkedLocale) return linkedLocale;

        let savedLocale = null;
        try {
            savedLocale = normalize(window.localStorage.getItem('chat-memo-lang'));
        } catch (error) {
            console.warn('官网语言偏好不可读取，使用浏览器语言:', error);
        }
        if (savedLocale) return savedLocale;

        const browserLocales = navigator.languages?.length
            ? navigator.languages
            : [navigator.language || navigator.userLanguage];
        return browserLocales.map(normalize).find(Boolean) || 'en';
    }

    function isCanonicalPath(pageName) {
        return new URL(window.location.href).pathname === pathFor(detectInitialLocale(), pageName);
    }

    async function loadCatalog(targetLocale) {
        if (!catalogCache.has(targetLocale)) {
            const response = await fetch(`/locales/${targetLocale}.json`);
            if (!response.ok) throw new Error(`Cannot load website locale ${targetLocale}: ${response.status}`);
            const catalog = await response.json();
            if (catalog.locale !== targetLocale) throw new Error(`Website locale mismatch: ${targetLocale}`);
            catalogCache.set(targetLocale, catalog);
        }
        return catalogCache.get(targetLocale);
    }

    function messages() {
        const english = catalogCache.get('en');
        const active = catalogCache.get(locale);
        return {
            ...english?.common,
            ...english?.[page],
            ...active?.common,
            ...active?.[page]
        };
    }

    function translate(key) {
        return messages()[key] || '';
    }

    function updateInternalLinks() {
        document.querySelectorAll('a[href]').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('//')) return;
            const target = new URL(href, window.location.origin);
            if (target.origin !== window.location.origin) return;
            const route = routeInfo(target.pathname);
            if (!route) return;
            target.pathname = pathFor(locale, route.page);
            target.searchParams.delete('lang');
            link.setAttribute('href', `${target.pathname}${target.search}${target.hash}`);
        });
    }

    function updateLocaleSelection() {
        document.querySelectorAll('[data-site-locale-option]').forEach((option) => {
            if (option.dataset.siteLocaleOption === locale) option.setAttribute('aria-current', 'true');
            else option.removeAttribute('aria-current');
        });
    }

    function apply() {
        if (!page || !catalogCache.has('en') || !catalogCache.has(locale)) return;
        document.documentElement.lang = locale;
        document.documentElement.dataset.lang = locale;
        const dictionary = messages();
        document.querySelectorAll('[data-key]').forEach((element) => {
            const key = element.dataset.key;
            if (Object.hasOwn(dictionary, key)) element.innerHTML = dictionary[key];
        });
        document.querySelectorAll('[data-alt-key]').forEach((element) => {
            const key = element.dataset.altKey;
            if (Object.hasOwn(dictionary, key)) element.alt = dictionary[key];
        });
        document.querySelectorAll('[data-aria-label-key]').forEach((element) => {
            const key = element.dataset.ariaLabelKey;
            if (Object.hasOwn(dictionary, key)) element.setAttribute('aria-label', dictionary[key]);
        });
        updateInternalLinks();
        updateLocaleSelection();
    }

    function choose(candidate) {
        const nextLocale = normalize(candidate);
        if (!nextLocale || !supportedLocales.includes(nextLocale)) throw new Error(`Unsupported locale: ${candidate}`);
        try {
            window.localStorage.setItem('chat-memo-lang', nextLocale);
        } catch (error) {
            // 受限浏览器仍可通过语言地址切换；仅不跨访问保存选择。
            console.warn('官网语言偏好不可保存:', error);
        }
        const url = new URL(window.location.href);
        url.pathname = pathFor(nextLocale, page);
        url.searchParams.delete('lang');
        window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    }

    async function init(pageName) {
        if (!['home', 'welcome', 'updates'].includes(pageName)) throw new Error(`Unsupported page: ${pageName}`);
        page = pageName;
        const requestedLocale = detectInitialLocale();
        const url = new URL(window.location.href);
        const canonicalPath = pathFor(requestedLocale, page);
        if (url.pathname !== canonicalPath) {
            url.pathname = canonicalPath;
            url.searchParams.delete('lang');
            window.location.replace(`${url.pathname}${url.search}${url.hash}`);
            return requestedLocale;
        }
        if (url.searchParams.has('lang')) {
            url.searchParams.delete('lang');
            window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        }
        try {
            await loadCatalog('en');
        } catch (error) {
            // 静态页面仍可阅读；词包异常不应阻断导航和更新记录加载。
            console.error('官网英文语言文件加载失败，保留静态页面:', error);
            locale = requestedLocale;
            updateLocaleSelection();
            return locale;
        }
        try {
            await loadCatalog(requestedLocale);
            locale = requestedLocale;
        } catch (error) {
            // 明确的静态语言 URL 自带完整译文；词包故障时不覆盖已有正文。
            console.error('官网语言加载失败，保留静态页面:', error);
            locale = requestedLocale;
            updateLocaleSelection();
            return locale;
        }
        apply();
        return locale;
    }

    window.SiteI18n = { init, apply, choose, isCanonicalPath, getLocale: () => locale, t: translate, messages, normalize, pathFor, routeInfo };
})();
