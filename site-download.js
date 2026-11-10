// 下载准备失败时保留当前页面；真正的安装包仍交给浏览器处理。
(function () {
    'use strict';
    const dialog = document.getElementById('download-dialog');
    if (!dialog || typeof dialog.showModal !== 'function' || !window.fetch) return;
    const chooseTitle = dialog.querySelector('[data-download-choose-title]');
    const failureTitle = dialog.querySelector('[data-download-failure-title]');
    const error = dialog.querySelector('[data-download-error]');
    let active = null;
    let serial = 0;
    let lastTrigger = null;

    function showDialog(failed) {
        chooseTitle.hidden = failed;
        failureTitle.hidden = !failed;
        error.hidden = true;
        if (!dialog.open) dialog.showModal();
    }
    dialog.querySelector('[data-download-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        serial += 1;
        active?.abort();
        active = null;
        lastTrigger?.focus();
    });

    function gateway() {
        const host = window.location.hostname;
        return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) ? window.location.origin : 'https://chatmemo.ai';
    }
    function safeDownload(path, base) {
        try {
            const url = new URL(path, base);
            const version = '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)';
            const mirror = new RegExp(`^/desktop/download/file/v(${version})/[a-f0-9]{64}/chatmemo-\\1-(?:arm64\\.dmg|x64\\.dmg|x64\\.exe)$`);
            const github = new RegExp(`^/desktop/releases/v(${version})/chatmemo-\\1-(?:arm64\\.dmg|x64\\.dmg|x64\\.exe)$`);
            return url.origin === base && (mirror.test(url.pathname) || github.test(url.pathname)) && !url.search && !url.hash ? url.href : null;
        } catch { return null; }
    }
    async function begin(anchor, platform) {
        if (active) return;
        const sequence = ++serial, controller = new AbortController(), base = gateway();
        active = controller;
        anchor.setAttribute('aria-busy', 'true');
        // 服务端最慢约 10.5 秒，还需为用户到网关的网络往返留出余量。
        const timeout = setTimeout(() => controller.abort(), 16000);
        try {
            const suffix = platform ? `/${platform}` : '';
            const response = await fetch(`${base}/desktop/download/prepare${suffix}?link=website`, {
                credentials: 'include', cache: 'no-store', signal: controller.signal,
            });
            if (!response.ok) throw new Error('prepare unavailable');
            const data = await response.json();
            if (sequence !== serial) return;
            if (data.status === 'choose' && !platform) { showDialog(false); return; }
            const target = data.status === 'ready' ? safeDownload(data.path, base) : null;
            if (!target) throw new Error('invalid installer response');
            if (dialog.open) dialog.close();
            window.location.assign(target);
        } catch {
            if (sequence !== serial) return;
            if (dialog.open) { chooseTitle.hidden = true; failureTitle.hidden = false; error.hidden = false; }
            else showDialog(true);
        } finally {
            clearTimeout(timeout);
            anchor.removeAttribute('aria-busy');
            if (active === controller) active = null;
        }
    }
    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target.closest('a[href]');
        if (!anchor || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self') return;
        let url;
        try { url = new URL(anchor.href, window.location.href); } catch { return; }
        if (!['chatmemo.ai', 'www.chatmemo.ai', 'localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return;
        const match = /^\/desktop\/download(?:\/(mac|mac-intel|win))?\/?$/.exec(url.pathname);
        if (!match || url.search !== '?link=website') return;
        event.preventDefault();
        if (!dialog.contains(anchor)) lastTrigger = anchor;
        void begin(anchor, match[1] || null);
    });
})();
