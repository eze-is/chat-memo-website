import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, parseFragment } from 'parse5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://chatmemo.ai';
const locales = ['en', 'zh-CN', 'ja', 'es'];
const pages = { home: 'index.html', welcome: 'welcome.html', updates: 'updates.html', pricing: 'pricing.html' };
const catalogs = Object.fromEntries(locales.map((locale) => [
    locale, JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'))
]));
const { updates, desktopUpdates } = JSON.parse(fs.readFileSync(path.join(root, 'updates-data.json'), 'utf8'));

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
    const navScripts = scripts.filter((node) => attribute(node, 'src')?.split('?')[0] === '/site-nav.js');
    assert.equal(navScripts.length, 1, `${file} single navigation script`);
    const initIndex = scripts.findIndex((node) => textOf(node).includes('SiteNav.init()'));
    assert.ok(initIndex > scripts.indexOf(navScripts[0]), `${file} navigation initializes after script load`);
}

test('16 个静态语言 URL 的初始 HTML 含对应正文、元信息与互返语言链接', () => {
    const utilities = fs.readFileSync(path.join(root, 'resource/marketing-utilities.css'));
    const version = createHash('sha256').update(utilities).digest('hex').slice(0, 12);
    for (const page of Object.keys(pages)) {
        for (const locale of locales) {
            const file = path.join(root, locale, pages[page]);
            const html = fs.readFileSync(file, 'utf8');
            const document = parse(html);
            assert.doesNotMatch(html, /cdn\.tailwindcss\.com/, file);
            assert.ok(find(document, node => node.tagName === 'link' && attribute(node, 'rel') === 'stylesheet'
                && attribute(node, 'href') === `/resource/marketing-utilities.css?v=${version}`), file);
            assertNavigationScript(document, file);
            const catalog = catalogs[locale];
            const canonical = `${origin}${route(locale, page)}`;
            const htmlElement = find(document, (node) => node.tagName === 'html');
            assert.equal(attribute(htmlElement, 'lang'), locale, file);
            assert.match(attribute(htmlElement, 'data-catalog-version'), /^[a-f0-9]{12}$/, `${file} versioned translations`);
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

            const key = page === 'updates' ? 'updates-title' : page === 'pricing' ? 'pricing-title' : 'hero-title';
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
        assert.equal(timeline.length, updates.length + desktopUpdates.length, locale);
        const container = find(updatesDocument, (node) => attribute(node, 'id') === 'updates-container');
        assert.ok(!(attribute(container, 'class') || '').split(' ').includes('hidden'), locale);
        assert.equal(attribute(container, 'data-rendered-locale'), locale);
        assert.ok(textOf(container).includes(updates[0].summary[locale]), locale);

        const homeDocument = parse(fs.readFileSync(path.join(base, 'index.html'), 'utf8'));
        const faqScript = find(homeDocument, (node) => node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json' && textOf(node).includes('FAQPage'));
        const faq = JSON.parse(textOf(faqScript));
        assert.equal(faq.mainEntity[0].name, textFromMarkup(catalogs[locale].home['faq1-q']));
        assert.equal(faq.mainEntity[0].acceptedAnswer.text, textFromMarkup(catalogs[locale].home['faq1-a']));
    }
});

test('sitemap 只列 16 个 canonical，并带与页面一致的 hreflang', () => {
    const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
    const blocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
    const expected = Object.keys(pages).flatMap((page) => locales.map((locale) => `${origin}${route(locale, page)}`));
    const locations = blocks.map((block) => block.match(/<loc>([^<]+)<\/loc>/)[1]);
    assert.deepEqual(locations, expected);
    for (const [index, block] of blocks.entries()) {
        const page = Object.keys(pages)[Math.floor(index / locales.length)];
        const links = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((match) => [match[1], match[2]]);
        assert.deepEqual(links, [
            ...locales.map((locale) => [locale, `${origin}${route(locale, page)}`]),
            ['x-default', `${origin}${page === 'home' ? '/' : `/${page}`}`]
        ]);
    }
    assert.match(fs.readFileSync(path.join(root, '404.html'), 'utf8'), /<meta name="robots" content="noindex">/);
    for (const file of ['index.html', ...locales.map((locale) => `${locale}/index.html`)]) {
        assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /<meta name="robots" content="[^"]*noindex/);
    }
});

test('robots.txt 允许搜索引擎和 AI 爬虫，并指向 sitemap', () => {
    const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
    assert.match(robots, /^Sitemap:\s*https:\/\/chatmemo\.ai\/sitemap\.xml\s*$/m);
    assert.doesNotMatch(robots, /Disallow:/);
    const groups = new Map();
    let agent = null;
    for (const line of robots.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        if (/^Sitemap:/i.test(trimmed)) continue;
        const match = trimmed.match(/^(User-agent|Allow|Disallow):\s*(.*)$/i);
        assert.ok(match, trimmed);
        if (match[1].toLowerCase() === 'user-agent') agent = match[2];
        else groups.set(agent, match[2]);
    }
    for (const bot of ['*', 'Googlebot', 'Bingbot', 'Baiduspider', 'DuckDuckBot', 'Applebot', 'YandexBot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Bytespider', 'Amazonbot', 'CCBot']) {
        assert.equal(groups.get(bot), '/', bot);
    }
});

test('中英首页结构化数据可解析，且不把爬虫短语写进可见正文', () => {
    const copy = {
        en: {
            title: 'Chat Memo - Auto-save every AI chat, continue with any AI',
            description: "Auto-save your AI chats on the web and desktop, from ChatGPT, Claude, Gemini and DeepSeek to Claude Code and Codex. Connect Chat Memo, and any AI knows what you've discussed and where to pick up.",
            featureList: [
                'Auto-save AI chats',
                'Back up ChatGPT, Claude, Gemini, DeepSeek conversations',
                'Export AI chat history',
                'Continue a conversation in another AI'
            ],
            keywords: [
                'Auto-save AI chats',
                'Back up ChatGPT, Claude, Gemini, DeepSeek conversations',
                'Export AI chat history',
                'Continue a conversation in another AI'
            ]
        },
        'zh-CN': {
            title: 'Chat Memo - 实时备份所有 AI 对话，换个 AI 也能接着聊',
            description: '实时备份你在网页和电脑上的 AI 对话，包括 ChatGPT、Claude、Gemini、DeepSeek、豆包，以及 Claude Code、Codex 等。连上 Chat Memo，打通 AI 之间的对话记忆，换到任何一个 AI，它都知道你聊过什么、接下来怎么聊。',
            featureList: [
                '自动保存 AI 聊天记录',
                '备份 ChatGPT、Claude、Gemini、DeepSeek 对话',
                '导出 AI 聊天记录',
                '换个 AI 接着聊'
            ],
            keywords: [
                '自动保存 AI 聊天记录',
                '备份 AI 聊天记录',
                '导出 AI 聊天记录',
                '换个 AI 接着聊'
            ]
        }
    };
    for (const locale of ['en', 'zh-CN']) {
        const files = locale === 'en' ? ['index.html', 'en/index.html'] : ['zh-CN/index.html'];
        for (const file of files) {
            const html = fs.readFileSync(path.join(root, file), 'utf8');
            const document = parse(html);
            assert.equal(textOf(find(document, (node) => node.tagName === 'title')), copy[locale].title, file);
            for (const name of ['description', 'og:description', 'twitter:description']) {
                const meta = find(document, (node) => node.tagName === 'meta' && (attribute(node, 'name') === name || attribute(node, 'property') === name));
                assert.equal(attribute(meta, 'content'), copy[locale].description, `${file} ${name}`);
            }
            for (const name of ['og:title', 'twitter:title']) {
                const meta = find(document, (node) => node.tagName === 'meta' && attribute(node, 'property') === name);
                assert.equal(attribute(meta, 'content'), copy[locale].title, `${file} ${name}`);
            }
            assert.equal(find(document, (node) => node.tagName === 'meta' && attribute(node, 'name') === 'keywords'), null, file);
            const scripts = all(document, (node) => node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json');
            const data = scripts.map((node) => JSON.parse(textOf(node)));
            assert.deepEqual(data.map((item) => item['@type']), ['SoftwareApplication', 'WebSite', 'FAQPage', 'Organization'], file);
            const software = data[0];
            const website = data[1];
            const faq = data[2];
            const organization = data[3];
            assert.equal(software.name, 'Chat Memo');
            assert.equal(software.applicationCategory, 'ProductivityApplication');
            assert.equal(software.operatingSystem, 'Windows, macOS');
            assert.equal(software.browserRequirements, 'Chrome, Microsoft Edge');
            assert.equal(software.url, `${origin}${route(locale, 'home')}`);
            assert.equal(software.description, copy[locale].description);
            assert.deepEqual(software.featureList, copy[locale].featureList);
            assert.deepEqual(software.keywords, copy[locale].keywords);
            for (const forbidden of ['offers', 'aggregateRating', 'review', 'interactionStatistic']) {
                assert.equal(software[forbidden], undefined, `${file} ${forbidden}`);
            }
            assert.equal(website.name, 'Chat Memo');
            assert.equal(website.url, `${origin}${route(locale, 'home')}`);
            assert.equal(website.description, copy[locale].description);
            assert.equal(website.potentialAction, undefined);
            assert.equal(organization['@type'], 'Organization');
            assert.equal(organization.name, 'Chat Memo');
            assert.equal(organization.url, origin);
            assert.equal(organization.description, copy[locale].description);
            const questions = all(document, (node) => attribute(node, 'data-key')?.match(/^faq[123]-q$/));
            assert.equal(faq.mainEntity.length, questions.length);
            for (const [index, question] of questions.entries()) {
                assert.equal(faq.mainEntity[index].name, textOf(question));
                const answer = question.parentNode.childNodes.find((node) => attribute(node, 'data-key') === question.attrs.find((item) => item.name === 'data-key').value.replace('-q', '-a'));
                assert.equal(faq.mainEntity[index].acceptedAnswer.text, textOf(answer));
            }
            const body = find(document, (node) => node.tagName === 'body');
            let visible = textOf(body);
            for (const script of scripts) visible = visible.replace(textOf(script), '');
            for (const phrase of copy[locale].featureList) assert.equal(visible.includes(phrase), false, `${file} visible ${phrase}`);
        }
    }
    for (const locale of ['ja', 'es']) {
        const document = parse(fs.readFileSync(path.join(root, locale, 'index.html'), 'utf8'));
        assert.equal(textOf(find(document, (node) => node.tagName === 'title')), catalogs[locale].meta.home.title);
        const software = JSON.parse(textOf(find(document, (node) => node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json' && textOf(node).includes('SoftwareApplication'))));
        assert.equal(software.keywords, undefined, locale);
        assert.equal(software.offers, undefined, locale);
        assert.equal(software.operatingSystem, 'Windows, macOS');
        assert.equal(software.description, catalogs[locale].meta.home.description);
        assert.equal(software.featureList[0], textFromMarkup(catalogs[locale].home['feature1-title']));
    }
});

test('中立入口指向稳定英文地址；静态正文不依赖脚本成功才可见', () => {
    for (const [page, file] of Object.entries(pages)) {
        const document = parse(fs.readFileSync(path.join(root, file), 'utf8'));
        assertNavigationScript(document, file);
        const head = find(document, node => node.tagName === 'head');
        const firstAfterCharset = head.childNodes.filter(node => node.tagName)[1];
        assert.equal(firstAfterCharset.tagName, 'script', file);
        assert.notEqual(attribute(firstAfterCharset, 'data-early-language-route'), undefined, file);
        assert.ok(firstAfterCharset.childNodes[0].value.includes(`SiteI18n.redirectToCanonical("${page}");`), file);
        const canonical = find(document, (node) => node.tagName === 'link' && attribute(node, 'rel') === 'canonical');
        assert.equal(attribute(canonical, 'href'), `${origin}${route('en', page)}`);
        if (page === 'home' || page === 'pricing') continue;
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        assert.doesNotMatch(html, /\.js \.(content|updates)-section/);
        assert.match(html, /\.intro-running \.(content|updates)-section/);
    }
});

test('四页先启动语言加载并立即绑定导航，再等待词包完成', () => {
    for (const [page, file] of Object.entries(pages)) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        const startup = new RegExp(`const\\s+i18nReady\\s*=\\s*SiteI18n\\.init\\('${page}'\\);\\s*SiteNav\\.init\\(\\);\\s*await\\s+i18nReady;`);
        if (page === 'pricing') {
            assert.ok(html.indexOf('ChatMemoPricing.init()') < html.indexOf('await i18nReady'), '报价不等待运行时词包');
            assert.match(html, /SiteNav\.init\(\);[\s\S]*if \(SiteI18n\.isCanonicalPath\('pricing'\)\) ChatMemoPricing\.init\(\);/);
        } else assert.match(html, startup, file);
    }
});

test('四语首页的按钮资源随实际内容换版本，首屏与页尾共用App表面流光', () => {
    for (const locale of locales) {
        const document = parse(fs.readFileSync(path.join(root, locale, 'index.html'), 'utf8'));
        const html = find(document, node => node.tagName === 'html');
        assert.match(attribute(html, 'data-catalog-version'), /^[a-f0-9]{12}$/);
        for (const asset of ['/site-i18n.js', '/hero-preview.js', '/hero-preview.css', '/resource/download-effects.css']) {
            const hash = createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 12);
            assert.ok(find(document, node => ['src', 'href'].some(name => attribute(node, name) === `${asset}?v=${hash}`)), `${locale} ${asset}`);
        }
        for (const id of ['hero-desktop-download-btn', 'cta-desktop-download-btn']) {
            const button = find(document, node => attribute(node, 'id') === id);
            assert.match(attribute(button, 'class'), /glass-flow/);
            assert.ok(find(button, node => attribute(node, 'class') === 'v1-try-sweep'));
        }
    }
});

test('官网各语言页面的App下载入口使用已登记的website来源', () => {
    let count = 0;
    for (const filename of [...Object.values(pages), ...locales.flatMap(locale => Object.values(pages).map(file => `${locale}/${file}`))]) {
        const document = parse(fs.readFileSync(path.join(root, filename), 'utf8'));
        for (const link of all(document, node => node.tagName === 'a' && attribute(node, 'href'))) {
            const url = new URL(attribute(link, 'href'), origin);
            if (url.origin !== origin || !/^\/desktop\/download(?:\/(?:mac|win))?$/.test(url.pathname)) continue;
            assert.equal(url.pathname, '/desktop/download', filename);
            assert.equal(url.searchParams.get('link'), 'website', filename);
            assert.deepEqual([...url.searchParams.keys()], ['link'], filename);
            count++;
        }
    }
    assert.ok(count >= 40, '覆盖导航桌面／手机入口，以及首屏／页尾入口');
});

test('通用方形缩略图与 Twitter 横版产品图分开提供', () => {
    const squarePath = '/resource/social/chatmemo-brand-square-20261106-v2.png';
    const square = fs.readFileSync(path.join(root, squarePath));
    assert.equal(square.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(square.readUInt32BE(16), 1024);
    assert.equal(square.readUInt32BE(20), 1024);
    assert.ok(square.length < 1_000_000);
    for (const locale of locales) {
        const imageLocale = locale === 'zh-CN' ? 'zh-CN' : 'en';
        const imagePath = `/resource/social/chatmemo-context-20261105${imageLocale === 'zh-CN' ? '-v3' : '-v2'}-${imageLocale}.png`;
        const png = fs.readFileSync(path.join(root, imagePath));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), 1200);
        assert.equal(png.readUInt32BE(20), 630);
        assert.ok(png.length < 5_000_000, '分享图片应小于 5 MB');
        for (const file of Object.values(pages)) {
            for (const prefix of locale === 'en' ? ['', 'en'] : [locale]) {
                const document = parse(fs.readFileSync(path.join(root, prefix, file), 'utf8'));
                const meta = key => all(document, node => node.tagName === 'meta' && (attribute(node, 'name') === key || attribute(node, 'property') === key));
                for (const key of ['og:image', 'twitter:image']) {
                    assert.equal(meta(key).length, 1, `${prefix}/${file} ${key}`);
                    assert.equal(attribute(meta(key)[0], 'content'), origin + (key === 'og:image' ? squarePath : imagePath));
                }
                assert.equal(attribute(meta('twitter:card')[0], 'content'), 'summary_large_image');
                assert.equal(attribute(meta('og:image:width')[0], 'content'), '1024');
                assert.equal(attribute(meta('og:image:height')[0], 'content'), '1024');
                assert.equal(attribute(meta('og:image:type')[0], 'content'), 'image/png');
                assert.equal(attribute(meta('og:image:alt')[0], 'content'), 'Chat Memo');
                assert.ok(attribute(meta('twitter:image:alt')[0], 'content').includes('Claude Code'));
                const icon = find(document, node => node.tagName === 'link' && attribute(node, 'rel') === 'icon');
                assert.ok(icon && !attribute(icon, 'href').includes('/social/'));
            }
        }
    }
});
