#!/usr/bin/env node
// 页面结构只维护在根部 HTML；词条和版本数据是内容源，本脚本生成可直接部署的静态语言页。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parse, parseFragment, serialize } from 'parse5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { render: renderUpdates } = require(path.join(root, 'updates-renderer.js'));
const locales = ['en', 'zh-CN', 'ja', 'es'];
const pages = { home: 'index.html', welcome: 'welcome.html', updates: 'updates.html' };
const origin = 'https://chatmemo.ai';
const check = process.argv.includes('--check');
const catalogs = Object.fromEntries(locales.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'))
]));
const updates = JSON.parse(fs.readFileSync(path.join(root, 'updates-data.json'), 'utf8')).updates;
const source = Object.fromEntries(Object.entries(pages).map(([page, file]) => [
    page,
    fs.readFileSync(path.join(root, file), 'utf8')
]));
const components = Object.fromEntries(['navbar', 'footer'].map((name) => [
    name,
    fs.readFileSync(path.join(root, 'components', `${name}.html`), 'utf8')
]));
const routeContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'site-i18n.js'), 'utf8'), routeContext);
const { pathFor, routeInfo } = routeContext.window.SiteI18n;
const expected = new Map();

function visit(node, callback) {
    callback(node);
    for (const child of node.childNodes || []) visit(child, callback);
}

function attr(node, name) {
    return node.attrs?.find((item) => item.name === name)?.value;
}

function setAttr(node, name, value) {
    if (!node.attrs) node.attrs = [];
    const existing = node.attrs.find((item) => item.name === name);
    if (existing) existing.value = value;
    else node.attrs.push({ name, value });
}

function removeAttr(node, name) {
    if (node.attrs) node.attrs = node.attrs.filter((item) => item.name !== name);
}

function byId(document, id) {
    let found = null;
    visit(document, (node) => {
        if (attr(node, 'id') === id) found = node;
    });
    if (!found) throw new Error(`Missing website element #${id}`);
    return found;
}

function setHtml(node, html) {
    node.childNodes = parseFragment(html).childNodes;
    for (const child of node.childNodes) child.parentNode = node;
}

function setText(node, value) {
    node.childNodes = [{ nodeName: '#text', value, parentNode: node }];
}

function addClass(node, className) {
    const classes = new Set((attr(node, 'class') || '').split(/\s+/).filter(Boolean));
    classes.add(className);
    setAttr(node, 'class', [...classes].join(' '));
}

function removeClass(node, className) {
    const classes = (attr(node, 'class') || '').split(/\s+/).filter((item) => item && item !== className);
    setAttr(node, 'class', classes.join(' '));
}

function appendMarkup(node, markup) {
    const children = parseFragment(markup).childNodes;
    for (const child of children) child.parentNode = node;
    node.childNodes.push(...children);
}

function textFromMarkup(markup) {
    const fragment = parseFragment(markup);
    let text = '';
    visit(fragment, (node) => {
        if (node.nodeName === '#text') text += node.value;
    });
    return text.replace(/\s+/g, ' ').trim();
}

function translated(catalog, page) {
    return { ...catalogs.en.common, ...catalogs.en[page], ...catalog.common, ...catalog[page] };
}

function setMeta(document, key, value) {
    let target = null;
    visit(document, (node) => {
        if (node.tagName === 'meta' && (attr(node, 'name') === key || attr(node, 'property') === key)) target = node;
    });
    if (target) {
        setAttr(target, 'content', value);
    } else {
        const kind = key.startsWith('og:') || key.startsWith('twitter:') ? 'property' : 'name';
        appendMarkup(byIdHead(document), `<meta ${kind}="${key}" content="${escapeAttr(value)}">`);
    }
}

function byIdHead(document) {
    let head = null;
    visit(document, (node) => { if (node.tagName === 'head') head = node; });
    if (!head) throw new Error('Missing website <head>');
    return head;
}

function escapeAttr(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function updateHead(document, page, locale, dictionary) {
    const metadata = { ...catalogs.en.meta[page], ...catalogs[locale].meta[page] };
    const canonical = `${origin}${pathFor(locale, page)}`;
    let title = null;
    let canonicalLink = null;
    const head = byIdHead(document);
    visit(head, (node) => {
        if (node.tagName === 'title') title = node;
        if (node.tagName === 'link' && attr(node, 'rel') === 'canonical') canonicalLink = node;
    });
    if (!title || !canonicalLink) throw new Error(`Missing title or canonical: ${page}`);
    setText(title, metadata.title);
    setAttr(canonicalLink, 'href', canonical);
    for (const [key, value] of Object.entries({
        description: metadata.description,
        language: locale,
        'og:url': canonical,
        'og:title': metadata.title,
        'og:description': metadata.description,
        'og:locale': { en: 'en_US', 'zh-CN': 'zh_CN', ja: 'ja_JP', es: 'es_ES' }[locale],
        'twitter:url': canonical,
        'twitter:title': metadata.title,
        'twitter:description': metadata.description
    })) setMeta(document, key, value);

    head.childNodes = head.childNodes.filter((node) => {
        if (node.tagName === 'link' && attr(node, 'rel') === 'alternate' && attr(node, 'hreflang')) return false;
        if (node.tagName === 'meta' && attr(node, 'property') === 'og:locale:alternate') return false;
        return true;
    });
    for (const alternate of locales) {
        appendMarkup(head, `<link rel="alternate" hreflang="${alternate}" href="${origin}${pathFor(alternate, page)}">`);
        if (alternate !== locale) {
            const ogLocale = { en: 'en_US', 'zh-CN': 'zh_CN', ja: 'ja_JP', es: 'es_ES' }[alternate];
            appendMarkup(head, `<meta property="og:locale:alternate" content="${ogLocale}">`);
        }
    }
    const defaultPath = page === 'home' ? '/' : `/${page}`;
    appendMarkup(head, `<link rel="alternate" hreflang="x-default" href="${origin}${defaultPath}">`);

    visit(head, (node) => {
        if (node.tagName !== 'script' || attr(node, 'type') !== 'application/ld+json') return;
        const raw = node.childNodes?.map((child) => child.value || '').join('') || '';
        const data = JSON.parse(raw);
        if (data['@type'] === 'SoftwareApplication') {
            data.description = metadata.description;
            data.url = canonical;
            data.featureList = [1, 2, 3, 4].map((number) => textFromMarkup(dictionary[`feature${number}-title`]));
        } else if (data['@type'] === 'WebSite') {
            data.description = metadata.description;
            data.inLanguage = locales;
        } else if (data['@type'] === 'FAQPage') {
            data.mainEntity = [1, 2, 3].map((number) => ({
                '@type': 'Question',
                name: textFromMarkup(dictionary[`faq${number}-q`]),
                acceptedAnswer: { '@type': 'Answer', text: textFromMarkup(dictionary[`faq${number}-a`]) }
            }));
        }
        setText(node, JSON.stringify(data).replaceAll('<', '\\u003c'));
    });
}

function localizeAttributesAndText(document, page, locale, dictionary) {
    const walk = (node) => {
        if (node.tagName) {
            const key = attr(node, 'data-key');
            if (key) {
                if (!Object.hasOwn(dictionary, key)) throw new Error(`Missing ${locale}.${page}.${key}`);
                setHtml(node, dictionary[key]);
            }
            const altKey = attr(node, 'data-alt-key');
            if (altKey) {
                if (!Object.hasOwn(dictionary, altKey)) throw new Error(`Missing ${locale}.${page}.${altKey}`);
                setAttr(node, 'alt', dictionary[altKey]);
            }
            const labelKey = attr(node, 'data-aria-label-key');
            if (labelKey) {
                if (!Object.hasOwn(dictionary, labelKey)) throw new Error(`Missing ${locale}.${page}.${labelKey}`);
                setAttr(node, 'aria-label', dictionary[labelKey]);
            }
            if (node.tagName === 'button' && attr(node, 'data-site-locale-option') !== undefined) {
                if (attr(node, 'data-site-locale-option') === locale) setAttr(node, 'aria-current', 'true');
                else removeAttr(node, 'aria-current');
            }
            for (const name of ['href', 'src', 'poster', 'content']) {
                const value = attr(node, name);
                if (value?.startsWith('resource/')) setAttr(node, name, `/${value}`);
            }
            if (node.tagName === 'a') {
                const href = attr(node, 'href');
                if (href && !href.startsWith('#') && !href.startsWith('//')) {
                    const target = new URL(href, origin);
                    const route = target.origin === origin ? routeInfo(target.pathname) : null;
                    if (route) {
                        target.pathname = pathFor(locale, route.page);
                        target.searchParams.delete('lang');
                        setAttr(node, 'href', `${target.pathname}${target.search}${target.hash}`);
                    }
                }
            }
        }
        for (const child of node.childNodes || []) walk(child);
    };
    walk(document);
}

function render(page, locale) {
    const document = parse(source[page]);
    const catalog = catalogs[locale];
    const dictionary = translated(catalog, page);
    let htmlElement = null;
    visit(document, (node) => { if (node.tagName === 'html') htmlElement = node; });
    setAttr(htmlElement, 'lang', locale);
    setAttr(htmlElement, 'data-lang', locale);
    setHtml(byId(document, 'navbar-container'), components.navbar);
    setHtml(byId(document, 'footer-container'), components.footer);
    if (page === 'updates') {
        const container = byId(document, 'updates-container');
        setHtml(container, renderUpdates(updates, locale, dictionary));
        setAttr(container, 'data-rendered-locale', locale);
        removeClass(container, 'hidden');
        addClass(byId(document, 'loading-state'), 'hidden');
    }
    localizeAttributesAndText(document, page, locale, dictionary);
    updateHead(document, page, locale, dictionary);
    // parse5 会把 </html> 后的换行重新归入 body；不保留末尾换行可保证二次生成字节稳定。
    return serialize(document).replace(/[ \t]+(?=\n)/g, '').trimEnd();
}

function sitemap() {
    const urls = Object.keys(pages).flatMap((page) => locales.map((locale) => `    <url><loc>${origin}${pathFor(locale, page)}</loc></url>`));
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

for (const page of Object.keys(pages)) {
    for (const locale of locales) {
        const output = render(page, locale);
        expected.set(path.join(root, locale, pages[page]), output);
        if (locale === 'en') expected.set(path.join(root, pages[page]), output);
    }
}
expected.set(path.join(root, 'sitemap.xml'), sitemap());

let stale = false;
for (const [file, output] of expected) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === output) continue;
    if (check) {
        let firstDifference = 0;
        while (firstDifference < output.length && output[firstDifference] === current?.[firstDifference]) firstDifference++;
        console.error(`Stale localized page: ${path.relative(root, file)} at ${firstDifference}`);
        if (process.argv.includes('--explain')) {
            console.error(`current: ${JSON.stringify(current?.slice(Math.max(0, firstDifference - 50), firstDifference + 120))}`);
            console.error(`expected: ${JSON.stringify(output.slice(Math.max(0, firstDifference - 50), firstDifference + 120))}`);
        }
        stale = true;
    } else {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, output);
        console.log(`Generated ${path.relative(root, file)}`);
    }
}
if (stale) process.exitCode = 1;
