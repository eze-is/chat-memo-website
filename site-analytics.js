// 统计只消费已发生的事件；SDK 下载与失败不参与页面初始化或交互。
(function () {
    'use strict';

    const page = document.currentScript.dataset.siteAnalytics;
    const gaId = 'G-C4C06BSVNL';
    if (!window.SiteI18n?.isCanonicalPath(page) || window.SiteAnalytics) return;
    const queue = [];
    let started = false;
    let gaReady = false;
    let flushScheduled = false;
    const gtag = function () { window.dataLayer.push(arguments); };

    function flush() {
        flushScheduled = false;
        for (const [name, params] of queue.splice(0)) {
            if (!gaReady && window.dataLayer.length >= 64) break;
            try {
                gtag('event', name, params);
            } catch (error) {
                console.warn('官网统计事件提交失败', error);
                break;
            }
        }
    }

    window.SiteAnalytics = {
        track(name, params) {
            if (queue.length >= 32) return;
            queue.push([name, params]);
            // 第三方可能接管 dataLayer.push；官网点击处理只写本地队列。
            if (started && !flushScheduled) {
                flushScheduled = true;
                setTimeout(flush, 0);
            }
        }
    };

    function start() {
        window.dataLayer ||= [];
        window.gtag = gtag;
        gtag('js', new Date());
        if (page === 'pricing') {
            // 定价页只记一次规范地址，保留原有的查询参数、片段及 referrer 排除规则。
            const location = window.location.origin + window.location.pathname;
            const context = { page_location: location, page_referrer: '' };
            gtag('config', gaId, { ...context, send_page_view: false });
            gtag('event', 'page_view', context);
        } else {
            gtag('config', gaId);
        }
        started = true;
        flush();
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        script.addEventListener('load', () => { gaReady = true; }, { once: true });
        script.addEventListener('error', () => console.warn('官网 GA4 脚本加载失败'), { once: true });
        document.head.append(script);
    }

    // 另起任务，保证 load 已完成；欢迎页等现有 load 回调也无需等统计网络。
    const afterLoad = () => setTimeout(start, 0);
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
})();
