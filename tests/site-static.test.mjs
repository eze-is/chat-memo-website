import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, parseFragment } from 'parse5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://chatmemo.ai';
const locales = ['en', 'zh-CN', 'ja', 'es'];
const pages = { home: 'index.html', welcome: 'welcome.html', updates: 'updates.html' };
const catalogs = Object.fromEntries(locales.map((locale) => [
    locale, JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'))
]));
const updates = JSON.parse(fs.readFileSync(path.join(root, 'updates-data.json'), 'utf8')).updates;

function route(locale, page) {
    const prefix = `/${locale}`;
    return page === 'home' ? `${prefix}/` : `${prefix}/${page}`;
}

function each(node, visitor) {
    visitor(node);
    for (const child of node.childNodes || []) each(child, visitor);
}

function attribute(node, name) {
    return node.attrs?.find((item) => item.name === name)?.value;
}

function find(document, predicate) {
    let found = null;
    each(document, (node) => { if (!found && predicate(node)) found = node; });
    return found;
}

function all(document, predicate) {
    const result = [];
    each(document, (node) => { if (predicate(node)) result.push(node); });
    return result;
}

function textOf(node) {
    let value = '';
    each(node, (part) => { if (part.nodeName === '#text') value += part.value; });
    return value.replace(/\s+/g, ' ').trim();
}

function textFromMarkup(markup) {
    return textOf(parseFragment(markup));
}

function assertNavigationScript(document, file) {
    const scripts = all(document, (node) => node.tagName === 'script');
    const navScripts = scripts.filter((node) => attribute(node, 'src') === '/site-nav.js');
    assert.equal(navScripts.length, 1, `${file} single navigation script`);
    const initIndex = scripts.findIndex((node) => textOf(node).includes('SiteNav.init()'));
    assert.ok(initIndex > scripts.indexOf(navScripts[0]), `${file} navigation initializes after script load`);
}

test('12 个静态语言 URL 的初始 HTML 含对应正文、元信息与互返语言链接', () => {
    for (const page of Object.keys(pages)) {
        for (const locale of locales) {
            const file = path.join(root, locale, pages[page]);
            const html = fs.readFileSync(file, 'utf8');
            const document = parse(html);
            assertNavigationScript(document, file);
            const catalog = catalogs[locale];
            const canonical = `${origin}${route(locale, page)}`;
            const htmlElement = find(document, (node) => node.tagName === 'html');
            assert.equal(attribute(htmlElement, 'lang'), locale, file);
            const title = find(document, (node) => node.tagName === 'title');
            assert.equal(textOf(title), catalog.meta[page].title, file);
            const description = find(document, (node) => node.tagName === 'meta' && attribute(node, 'name') === 'description');
            assert.equal(attribute(description, 'content'), catalog.meta[page].description, file);
            assert.equal(find(document, (node) => node.tagName === 'meta' && attribute(node, 'name') === 'keywords'), null, `${file} obsolete keywords`);
            const canonicalLink = find(document, (node) => node.tagName === 'link' && attribute(node, 'rel') === 'canonical');
            assert.equal(attribute(canonicalLink, 'href'), canonical, file);
            for (const name of ['og:url', 'twitter:url']) {
                const meta = find(document, (node) => node.tagName === 'meta' && attribute(node, 'property') === name);
                assert.equal(attribute(meta, 'content'), canonical, `${file} ${name}`);
            }
            for (const name of ['og:title', 'twitter:title']) {
                const meta = find(document, (node) => node.tagName === 'meta' && attribute(node, 'property') === name);
                assert.equal(attribute(meta, 'content'), catalog.meta[page].title, `${file} ${name}`);
            }
            const alternates = all(document, (node) => node.tagName === 'link' && attribute(node, 'rel') === 'alternate' && attribute(node, 'hreflang'));
            assert.equal(alternates.length, 5, file);
            for (const other of locales) {
                const alternate = alternates.find((node) => attribute(node, 'hreflang') === other);
                assert.equal(attribute(alternate, 'href'), `${origin}${route(other, page)}`, `${file} ${other}`);
            }
            assert.equal(attribute(alternates.find((node) => attribute(node, 'hreflang') === 'x-default'), 'href'), `${origin}${page === 'home' ? '/' : `/${page}`}`);

            const key = page === 'updates' ? 'updates-title' : 'hero-title';
            const headline = find(document, (node) => attribute(node, 'data-key') === key);
            assert.equal(textOf(headline), textFromMarkup(catalog[page][key]), `${file} ${key}`);
            assert.ok(find(document, (node) => attribute(node, 'id') === 'navbar-container')?.childNodes?.length, `${file} navbar`);
            assert.ok(find(document, (node) => attribute(node, 'id') === 'footer-container')?.childNodes?.length, `${file} footer`);
            assert.doesNotMatch(html, /(?:src|href|poster)="resource\//, `${file} relative asset`);
            const triggers = all(document, (node) => node.tagName === 'button' && attribute(node, 'data-site-locale-trigger') !== undefined);
            assert.equal(triggers.length, 1, `${file} single language control`);
            const trigger = triggers[0];
            assert.equal(attribute(trigger, 'aria-label'), catalog.common['language-label'], `${file} language label`);
            assert.equal(attribute(trigger, 'aria-expanded'), 'false', `${file} menu initially collapsed`);
            assert.ok(find(trigger, (node) => node.tagName === 'svg' && attribute(node, 'aria-hidden') === 'true'), `${file} decorative language icon`);
            const panels = all(document, (node) => attribute(node, 'data-site-locale-options') !== undefined);
            assert.equal(panels.length, 1, `${file} single language menu`);
            const panel = panels[0];
            assert.equal(attribute(trigger, 'aria-controls'), attribute(panel, 'id'), `${file} menu association`);
            assert.ok(attribute(panel, 'hidden') !== undefined, `${file} menu initially hidden`);
            const mobileTrigger = find(document, (node) => attribute(node, 'id') === 'mobile-menu-button');
            assert.equal(attribute(mobileTrigger, 'aria-controls'), 'mobile-menu', `${file} mobile menu association`);
            assert.equal(attribute(mobileTrigger, 'aria-expanded'), 'false', `${file} mobile menu initially collapsed`);
            const options = all(panel, (node) => node.tagName === 'button' && attribute(node, 'data-site-locale-option') !== undefined);
            assert.deepEqual(options.map((node) => attribute(node, 'data-site-locale-option')), ['zh-CN', 'en', 'ja', 'es'], `${file} language choices`);
            const selected = options.filter((node) => attribute(node, 'aria-current') === 'true');
            assert.equal(selected.length, 1, `${file} selected locale count`);
            assert.equal(attribute(selected[0], 'data-site-locale-option'), locale, `${file} selected locale`);
            assert.equal(all(document, (node) => node.tagName === 'select' && attribute(node, 'data-site-locale-select') !== undefined).length, 0, `${file} native picker retired`);
            for (const link of all(document, (node) => node.tagName === 'a' && attribute(node, 'title') === 'WeChat')) {
                assert.equal(attribute(link, 'href'), '#', `${file} WeChat placeholder`);
            }
        }
    }
});

test('四语更新记录在初始 HTML 中完整可见，结构化 FAQ 与正文同语', () => {
    for (const locale of locales) {
        const base = path.join(root, locale);
        const updatesHtml = fs.readFileSync(path.join(base, 'updates.html'), 'utf8');
        const updatesDocument = parse(updatesHtml);
        const timeline = all(updatesDocument, (node) => node.tagName === 'div' && (attribute(node, 'class') || '').split(' ').includes('timeline-item'));
        assert.equal(timeline.length, updates.length, locale);
        const container = find(updatesDocument, (node) => attribute(node, 'id') === 'updates-container');
        assert.ok(!attribute(container, 'class').split(' ').includes('hidden'), locale);
        assert.equal(attribute(container, 'data-rendered-locale'), locale);
        assert.ok(textOf(container).includes(updates[0].summary[locale]), locale);

        const homeDocument = parse(fs.readFileSync(path.join(base, 'index.html'), 'utf8'));
        const faqScript = find(homeDocument, (node) => node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json' && textOf(node).includes('FAQPage'));
        const faq = JSON.parse(textOf(faqScript));
        assert.equal(faq.mainEntity[0].name, textFromMarkup(catalogs[locale].home['faq1-q']));
        assert.equal(faq.mainEntity[0].acceptedAnswer.text, textFromMarkup(catalogs[locale].home['faq1-a']));
    }
});

test('sitemap 只列 12 个 canonical，未知路由有真实 404 文件', () => {
    const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const expected = Object.keys(pages).flatMap((page) => locales.map((locale) => `${origin}${route(locale, page)}`));
    assert.deepEqual(locations, expected);
    assert.match(fs.readFileSync(path.join(root, '404.html'), 'utf8'), /<meta name="robots" content="noindex">/);
});

test('中立入口指向稳定英文地址；静态正文不依赖脚本成功才可见', () => {
    for (const [page, file] of Object.entries(pages)) {
        const document = parse(fs.readFileSync(path.join(root, file), 'utf8'));
        assertNavigationScript(document, file);
        const canonical = find(document, (node) => node.tagName === 'link' && attribute(node, 'rel') === 'canonical');
        assert.equal(attribute(canonical, 'href'), `${origin}${route('en', page)}`);
        if (page === 'home') continue;
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        assert.doesNotMatch(html, /\.js \.(content|updates)-section/);
        assert.match(html, /\.intro-running \.(content|updates)-section/);
    }
});

test('三页先启动语言加载并立即绑定导航，再等待词包完成', () => {
    for (const [page, file] of Object.entries(pages)) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        const startup = new RegExp(`const\\s+i18nReady\\s*=\\s*SiteI18n\\.init\\('${page}'\\);\\s*SiteNav\\.init\\(\\);\\s*await\\s+i18nReady;`);
        assert.match(html, startup, file);
    }
});
