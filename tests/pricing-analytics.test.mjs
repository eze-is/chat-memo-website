import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../site-i18n.js', import.meta.url), 'utf8');
function run(page, pathname) {
  const html = fs.readFileSync(new URL('../' + page, import.meta.url), 'utf8');
  const block = html.match(/<script data-pricing-page-view(?:="")?>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(block, page);
  const location = new URL(`https://chatmemo.ai${pathname}?ticket=private-ticket&email=private@example.test#secret`);
  const window = { location, localStorage: { getItem() { return null; } } };
  const context = vm.createContext({ window, URL, navigator: { languages: ['en'] } });
  vm.runInContext(source, context);
  context.SiteI18n = window.SiteI18n;
  Object.defineProperty(context, 'gtag', { get: () => window.gtag });
  vm.runInContext(block, context);
  vm.runInContext(block, context); // 重复装配也不能多记浏览量。
  return Array.from(window.dataLayer ?? [], item => Array.from(item));
}

test('四语定价只发送一次标准page_view，位置不含query/hash/凭证', () => {
  for (const locale of ['en', 'zh-CN', 'ja', 'es']) {
    const calls = run(`${locale}/pricing.html`, `/${locale}/pricing`);
    assert.equal(calls.filter(item => item[0] === 'config').length, 1);
    assert.equal(calls.find(item => item[0] === 'config')[2].send_page_view, false);
    const views = calls.filter(item => item[0] === 'event' && item[1] === 'page_view');
    assert.equal(views.length, 1);
    assert.equal(views[0][2].page_location, `https://chatmemo.ai/${locale}/pricing`);
    assert.equal(views[0][2].page_referrer, '');
    assert.doesNotMatch(JSON.stringify(calls), /private|ticket|secret|@/);
  }
});

test('中立入口只负责语言跳转，别名未规范化前不发送GA浏览量', () => {
  for (const pathname of ['/pricing', '/pricing.html', '/en/pricing.html', '/en/pricing/']) {
    assert.deepEqual(run('pricing.html', pathname), []);
  }
});
