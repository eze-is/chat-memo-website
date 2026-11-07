import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const i18nSource = read('site-i18n.js');
function run(page, pathname) {
    const html = read(page);
    const block = html.match(/<script data-site-analytics="([^"]+)">([\s\S]*?)<\/script>/);
    const location = new URL(`https://chatmemo.ai${pathname}?ticket=private-ticket&email=private@example.test#secret`);
    const window = { location, localStorage: { getItem() { return null; } } };
    const listeners = new Map(), scheduled = [], scripts = [];
    window.addEventListener = (type, handler) => listeners.set(type, handler);
    const document = {
        currentScript: { dataset: { siteAnalytics: block?.[1] } },
        readyState: 'loading',
        createElement: () => ({ addEventListener() {} }),
        head: { append: script => scripts.push(script) }
    };
    const context = vm.createContext({ window, document, URL, navigator: { languages: ['en'] }, setTimeout: fn => scheduled.push(fn) });
    vm.runInContext(i18nSource, context);
    if (block) {
        vm.runInContext(block[2], context);
        vm.runInContext(block[2], context); // 重复装配也不能多记浏览量。
    }
    return {
        scripts, window,
        calls: () => Array.from(window.dataLayer ?? [], item => Array.from(item)),
        fireLoad: () => listeners.get('load')?.(),
        nextTask: () => scheduled.splice(0).forEach(fn => fn())
    };
}

test('四语定价在 load 后才请求统计，且只记一次脱敏的标准 page_view', () => {
    for (const locale of ['en', 'zh-CN', 'ja', 'es']) {
        const h = run(`${locale}/pricing.html`, `/${locale}/pricing`);
        assert.equal(h.scripts.length, 0);
        h.fireLoad();
        assert.equal(h.scripts.length, 0);
        h.nextTask();
        assert.equal(h.scripts.length, 1);
        assert.equal(new URL(h.scripts[0].src).hostname, 'www.googletagmanager.com');
        assert.equal(h.scripts[0].async, true);
        const calls = h.calls();
        assert.equal(calls.filter(item => item[0] === 'config').length, 1);
        assert.equal(calls.find(item => item[0] === 'config')[2].send_page_view, false);
        const views = calls.filter(item => item[0] === 'event' && item[1] === 'page_view');
        assert.equal(views.length, 1);
        assert.equal(views[0][2].page_location, `https://chatmemo.ai/${locale}/pricing`);
        assert.equal(views[0][2].page_referrer, '');
        assert.doesNotMatch(JSON.stringify(calls), /private|ticket|secret|@/);
    }
});

test('中立或非规范地址不请求统计，避免语言跳转双计', () => {
    for (const [file, pathname] of [
        ['pricing.html', '/pricing'], ['pricing.html', '/pricing.html'],
        ['en/pricing.html', '/en/pricing.html'], ['en/pricing.html', '/en/pricing/']
    ]) {
        const h = run(file, pathname);
        h.fireLoad(); h.nextTask();
        assert.equal(h.scripts.length, 0);
        assert.deepEqual(h.calls(), []);
    }
});

test('四语营销页统一用 GA4，法律页与嵌入演示没有统计加载器', () => {
    const locales = ['en', 'zh-CN', 'ja', 'es'];
    const pages = ['index', 'welcome', 'updates', 'pricing'];
    for (const locale of locales) for (const page of pages) {
        const file = `${locale}/${page}.html`;
        const route = page === 'index' ? `/${locale}/` : `/${locale}/${page}`;
        const h = run(file, route);
        h.fireLoad(); h.nextTask();
        assert.deepEqual(h.scripts.map(script => new URL(script.src).hostname), ['www.googletagmanager.com'], file);
        assert.doesNotMatch(read(file), /cloudflareinsights\.com|data-cf-beacon/, file);
    }
    const excluded = ['resource/hero-desktop/index.html'];
    for (const prefix of ['', 'en/', 'zh-CN/']) for (const page of ['privacy', 'terms']) {
        excluded.push(`${prefix}desktop/${page}.html`);
    }
    for (const file of excluded) {
        assert.doesNotMatch(read(file), /data-site-analytics|googletagmanager\.com|cloudflareinsights\.com|data-cf-beacon/, file);
    }
});

test('统计未开始时暂存点击，SDK 一直未完成时队列保持有界', () => {
    const h = run('en/index.html', '/en/');
    h.window.SiteAnalytics.track('navigation_click', { destination: '/en/pricing' });
    assert.deepEqual(h.calls(), []);
    h.fireLoad(); h.nextTask();
    assert.equal(h.calls().filter(item => item[0] === 'event' && item[1] === 'navigation_click').length, 1);
    const before = h.calls().length;
    for (let i = 0; i < 100; i++) h.window.SiteAnalytics.track('button_click', {});
    assert.equal(h.calls().length, before, '点击处理不调用第三方的 dataLayer.push');
    h.nextTask();
    for (let i = 0; i < 100; i++) h.window.SiteAnalytics.track('button_click', {});
    h.nextTask();
    assert.equal(h.calls().length, 64);
});
