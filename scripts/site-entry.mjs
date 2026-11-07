import { readFileSync } from 'node:fs';

const read = name => {
    const source = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8').trim();
    if (/<\/script/i.test(source)) throw new Error(`不能内联脚本 ${name}`);
    return source;
};
export const i18nSource = read('site-i18n.js');
const analyticsSource = read('site-analytics.js');

// 中立入口优先跳转，正文保留为无脚本时的英文兜底。
export const earlyLanguageScript = page => `<script data-early-language-route>${i18nSource}
SiteI18n.redirectToCanonical(${JSON.stringify(page)});</script>`;
export const analyticsScript = page => `<script data-site-analytics="${page}">${analyticsSource}</script>`;
