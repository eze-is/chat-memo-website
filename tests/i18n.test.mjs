import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['zh-CN', 'en', 'ja', 'es'];
const pages = { index: 'home', welcome: 'welcome', updates: 'updates' };
const catalogs = Object.fromEntries(locales.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8'))
]));

function createLocaleOptionsDocument() {
    const options = Object.fromEntries(locales.map((locale) => {
        const attributes = new Map();
        return [locale, {
            dataset: { siteLocaleOption: locale },
            setAttribute(name, value) { attributes.set(name, String(value)); },
            getAttribute(name) { return attributes.get(name) || null; },
            removeAttribute(name) { attributes.delete(name); }
        }];
    }));
    const document = {
        documentElement: { lang: '', dataset: {} },
        querySelectorAll: (selector) => selector === '[data-site-locale-option]' ? Object.values(options) : [],
        title: ''
    };
    return { document, options };
}

test('四语页面词条和元信息与英文基准完整对齐', () => {
    for (const locale of locales) {
        const catalog = catalogs[locale];
        assert.equal(catalog.locale, locale);
        for (const section of ['common', 'home', 'welcome', 'updates']) {
            assert.deepEqual(Object.keys(catalog[section]).sort(), Object.keys(catalogs.en[section]).sort(), `${locale} ${section}`);
            for (const [key, value] of Object.entries(catalog[section])) {
                assert.equal(typeof value, 'string', `${locale} ${section}.${key}`);
                assert.ok(value.trim(), `${locale} ${section}.${key}`);
            }
        }
        for (const page of Object.values(pages)) {
            assert.ok(catalog.meta[page].title.trim(), `${locale} ${page} title`);
            assert.ok(catalog.meta[page].description.trim(), `${locale} ${page} description`);
        }
    }
});

test('页面和共享组件引用的词条都有归属', () => {
    const componentHtml = ['navbar', 'footer'].map((name) => fs.readFileSync(path.join(root, 'components', `${name}.html`), 'utf8')).join('\n');
    const commonKeys = [...componentHtml.matchAll(/data-(?:key|alt-key|aria-label-key)="([^"]+)"/g)].map((match) => match[1]);
    for (const key of commonKeys) assert.ok(Object.hasOwn(catalogs.en.common, key), `common.${key}`);
    for (const [file, page] of Object.entries(pages)) {
        const html = fs.readFileSync(path.join(root, `${file}.html`), 'utf8');
        for (const [, key] of html.matchAll(/data-(?:key|alt-key|aria-label-key)="([^"]+)"/g)) {
            assert.ok(Object.hasOwn(catalogs.en[page], key) || Object.hasOwn(catalogs.en.common, key), `${file}: ${key}`);
        }
    }
});

test('全部历史更新四语完整，英文是唯一缺译兜底', () => {
    const { updates } = JSON.parse(fs.readFileSync(path.join(root, 'updates-data.json'), 'utf8'));
    assert.ok(updates.length > 0);
    for (const update of updates) {
        for (const field of ['date', 'summary']) {
            for (const locale of locales) assert.ok(update[field][locale]?.trim(), `${update.version} ${field}.${locale}`);
        }
        for (const feature of update.features) {
            for (const field of ['title', 'description']) {
                for (const locale of locales) assert.ok(feature[field][locale]?.trim(), `${update.version} ${field}.${locale}`);
            }
        }
    }
});

async function createRuntime({ url, languages, saved, fetchCatalog, storageUnavailable = false, page = 'home', withLocaleOptions = false }) {
    const storage = new Map(saved ? [['chat-memo-lang', saved]] : []);
    let writes = 0;
    const location = {
        href: url,
        assign(next) { this.href = new URL(next, this.href).href; },
        replace(next) { this.href = new URL(next, this.href).href; }
    };
    const fakeWindow = {
        location,
        localStorage: {
            getItem: (key) => {
                if (storageUnavailable) throw new Error('storage blocked');
                return storage.get(key) || null;
            },
            setItem: (key, value) => {
                if (storageUnavailable) throw new Error('storage blocked');
                writes += 1;
                storage.set(key, value);
            }
        },
        history: { replaceState: (_, __, next) => { location.href = new URL(next, location.href).href; } }
    };
    const localeUi = withLocaleOptions ? createLocaleOptionsDocument() : null;
    const fakeDocument = localeUi?.document || {
        documentElement: { lang: '', dataset: {} },
        querySelectorAll: () => [],
        title: ''
    };
    const context = {
        window: fakeWindow,
        document: fakeDocument,
        navigator: { languages, language: languages[0] },
        URL,
        Object,
        console: { error: () => {}, warn: () => {} },
        fetch: fetchCatalog || (async (resource) => ({
            ok: true,
            json: async () => JSON.parse(fs.readFileSync(path.join(root, resource.slice(1)), 'utf8'))
        }))
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'site-i18n.js'), 'utf8'), context);
    await fakeWindow.SiteI18n.init(page);
    return { runtime: fakeWindow.SiteI18n, location, storage, getWrites: () => writes, document: fakeDocument, localeUi };
}

test('分享链接优先于保存偏好，自动检测不写入偏好，手选才持久化', async () => {
    const legacy = await createRuntime({ url: 'https://chatmemo.ai/?lang=ja', languages: ['es-419'], saved: 'zh-CN' });
    assert.equal(legacy.location.href, 'https://chatmemo.ai/ja/');
    assert.equal(legacy.getWrites(), 0);
    const context = await createRuntime({ url: legacy.location.href, languages: ['es-419'], saved: 'zh-CN' });
    assert.equal(context.runtime.getLocale(), 'ja');
    assert.equal(context.getWrites(), 0);
    assert.equal(context.document.documentElement.lang, 'ja');
    context.runtime.choose('es');
    assert.equal(context.location.href, 'https://chatmemo.ai/es/');
    assert.equal(context.storage.get('chat-memo-lang'), 'es');
    assert.equal(context.getWrites(), 1);
});

test('地区语言归入基础语言，未知语言回退英文', async () => {
    const spanish = await createRuntime({ url: 'https://chatmemo.ai/', languages: ['es-MX'] });
    assert.equal(spanish.location.href, 'https://chatmemo.ai/es/');
    assert.equal((await createRuntime({ url: spanish.location.href, languages: ['es-MX'] })).runtime.getLocale(), 'es');
    assert.equal((await createRuntime({ url: 'https://chatmemo.ai/', languages: ['ja-JP'] })).location.href, 'https://chatmemo.ai/ja/');
    assert.equal((await createRuntime({ url: 'https://chatmemo.ai/', languages: ['fr-FR'] })).location.href, 'https://chatmemo.ai/en/');
});

test('明确的语言路径优先于旧查询参数、保存偏好和浏览器语言', async () => {
    const context = await createRuntime({
        url: 'https://chatmemo.ai/ja/welcome?lang=es', languages: ['es-MX'], saved: 'zh-CN', page: 'welcome'
    });
    assert.equal(context.runtime.getLocale(), 'ja');
    assert.equal(context.location.href, 'https://chatmemo.ai/ja/welcome');
    assert.equal(context.getWrites(), 0);
    assert.equal(context.runtime.pathFor('es', 'updates'), '/es/updates');
    assert.equal(context.runtime.pathFor('en', 'home'), '/en/');
    assert.equal(context.runtime.isCanonicalPath('welcome'), true);
    const english = await createRuntime({ url: 'https://chatmemo.ai/en/welcome', languages: ['ja-JP'], saved: 'es', page: 'welcome' });
    assert.equal(english.runtime.getLocale(), 'en');
    assert.equal(english.location.href, 'https://chatmemo.ai/en/welcome');
});

test('手动切换直接导航到静态语言页，不依赖切换前的词包加载', async () => {
    const context = await createRuntime({
        url: 'https://chatmemo.ai/en/updates?ref=header#latest', languages: ['en'], page: 'updates',
        fetchCatalog: async (resource) => {
            if (resource.endsWith('/en.json')) return { ok: true, json: async () => catalogs.en };
            throw new Error('offline');
        }
    });
    context.runtime.choose('ja');
    assert.equal(context.location.href, 'https://chatmemo.ai/ja/updates?ref=header#latest');
    assert.equal(context.storage.get('chat-memo-lang'), 'ja');
});

test('运行时只标记当前语言选项，不接管导航菜单交互', async () => {
    const context = await createRuntime({ url: 'https://chatmemo.ai/en/updates', languages: ['en'], page: 'updates', withLocaleOptions: true });
    const { options } = context.localeUi;
    assert.equal(options.en.getAttribute('aria-current'), 'true');
    assert.equal(options.es.getAttribute('aria-current'), null);
    options.es.setAttribute('aria-current', 'true');
    context.runtime.apply();
    assert.equal(options.en.getAttribute('aria-current'), 'true');
    assert.equal(options.es.getAttribute('aria-current'), null);
});

test('英文词包失败时语言初始化不阻断静态页面', async () => {
    const context = await createRuntime({
        url: 'https://chatmemo.ai/en/',
        languages: ['en'],
        fetchCatalog: async () => { throw new Error('offline'); }
    });
    assert.equal(context.runtime.getLocale(), 'en');
    assert.equal(context.getWrites(), 0);
});

test('浏览器禁用本地存储时仍可按浏览器语言显示和手动切换', async () => {
    const context = await createRuntime({
        url: 'https://chatmemo.ai/ja/',
        languages: ['ja-JP'],
        storageUnavailable: true
    });
    assert.equal(context.runtime.getLocale(), 'ja');
    context.runtime.choose('es');
    assert.equal(context.location.href, 'https://chatmemo.ai/es/');
});

test('三个页面内联脚本保持语法有效', () => {
    for (const file of Object.keys(pages)) {
        const html = fs.readFileSync(path.join(root, `${file}.html`), 'utf8');
        for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
            if (match[1].includes('application/ld+json') || !match[2].trim()) continue;
            new vm.Script(match[2], { filename: file });
        }
    }
});
