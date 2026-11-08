// 官网语言规则只在这里解释；页面词条和版本记录各由自己的数据文件拥有。
(function () {
    'use strict';

    const supportedLocales = ['zh-CN', 'en', 'ja', 'es'];
    const catalogCache = new Map();
    let page = null;
    let locale = 'en';

    function localesFor(pageName) {
        return pageName?.startsWith('desktop/') ? ['zh-CN', 'en'] : supportedLocales;
    }

    function routeInfo(pathname) {
        const legal = pathname.match(/^\/(?:(zh-CN|en)\/)?(desktop\/(?:privacy|terms))(?:\.html)?\/?$/);
        if (legal) return { locale: legal[1] || null, page: legal[2] };
        const localized = pathname.match(/^\/(zh-CN|en|ja|es)(?:\/(welcome|updates|pricing|downloads)(?:\.html)?)?\/?$/);
        if (localized) return { locale: localized[1], page: localized[2] || 'home' };
        const base = pathname.match(/^\/(welcome|updates|pricing|downloads|get)(?:\.html)?\/?$/);
        if (base) return { locale: null, page: base[1] === 'get' ? 'downloads' : base[1] };
        if (pathname === '/') return { locale: null, page: 'home' };
        return null;
    }

    function pathFor(targetLocale, targetPage) {
        const availableLocale = localesFor(targetPage).includes(targetLocale) ? targetLocale : 'en';
        const prefix = `/${availableLocale}`;
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
        const available = candidate => localesFor(page || route?.page).includes(candidate) ? candidate : 'en';
        if (route?.locale) return available(route.locale);
        const linkedLocale = normalize(url.searchParams.get('lang'));
        if (linkedLocale) return available(linkedLocale);

        let savedLocale = null;
        try {
            savedLocale = normalize(window.localStorage.getItem('chat-memo-lang'));
        } catch (error) {
            console.warn('官网语言偏好不可读取，使用浏览器语言:', error);
        }
        if (savedLocale) return available(savedLocale);

        const browserLocales = navigator.languages?.length
            ? navigator.languages
            : [navigator.language || navigator.userLanguage];
        return available(browserLocales.map(normalize).find(Boolean) || 'en');
    }

    function isCanonicalPath(pageName) {
        return new URL(window.location.href).pathname === pathFor(detectInitialLocale(), pageName);
    }

    async function loadCatalog(targetLocale) {
        if (!catalogCache.has(targetLocale)) {
            const version = document.documentElement.dataset.catalogVersion;
            const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
            const response = await fetch(`/locales/${targetLocale}.json${suffix}`);
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
        if (!nextLocale || !localesFor(page).includes(nextLocale)) throw new Error(`Unsupported locale: ${candidate}`);
        try {
            window.localStorage.setItem('chat-memo-lang', nextLocale);
        } catch (error) {
            // 受限浏览器仍可通过语言地址切换；仅不跨访问保存选择。
            console.warn('官网语言偏好不可保存:', error);
        }
        const url = new URL(window.location.href);
        url.pathname = pathFor(nextLocale, page);
        url.searchParams.delete('lang');
        // 营销页换语言从顶部阅读；法律文档保留当前条款位置。
        if (!page.startsWith('desktop/')) url.hash = '';
        window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    }

    // 中立入口在 head 执行同一个路由规则；运行时继续覆盖非规范直达地址。
    function redirectToCanonical(pageName) {
        const url = new URL(window.location.href);
        const canonicalPath = pathFor(detectInitialLocale(), pageName);
        if (url.pathname === canonicalPath) return false;
        url.pathname = canonicalPath;
        url.searchParams.delete('lang');
        window.location.replace(`${url.pathname}${url.search}${url.hash}`);
        return true;
    }

    async function init(pageName) {
        if (!['home', 'welcome', 'updates', 'pricing', 'downloads', 'desktop/privacy', 'desktop/terms'].includes(pageName)) throw new Error(`Unsupported page: ${pageName}`);
        page = pageName;
        if (redirectToCanonical(pageName)) return detectInitialLocale();
        const requestedLocale = detectInitialLocale();
        const url = new URL(window.location.href);
        if (url.searchParams.has('lang')) {
            url.searchParams.delete('lang');
            window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        }
        if (page.startsWith('desktop/')) {
            // 法律正文由已审阅的双语静态页拥有，不加载营销词包或覆盖正文。
            locale = requestedLocale;
            updateLocaleSelection();
            return locale;
        }
        locale = requestedLocale;
        const english = loadCatalog('en');
        // 两份词包同时请求。即使当前语言先失败，也要等英文兜底可用再完成初始化。
        const active = locale === 'en' ? null : loadCatalog(locale).then(
            () => ({ ok: true }),
            error => ({ ok: false, error })
        );
        try {
            await english;
            if (active) {
                const result = await active;
                if (!result.ok) throw result.error;
            }
        } catch (error) {
            // 明确的静态语言 URL 自带完整译文；词包故障时不覆盖已有正文。
            console.error('官网语言加载失败，保留静态页面:', error);
            updateLocaleSelection();
            return locale;
        }
        apply();
        return locale;
    }

    window.SiteI18n = { init, apply, choose, redirectToCanonical, isCanonicalPath, getLocale: () => locale, t: translate, messages, normalize, pathFor, routeInfo };
})();
