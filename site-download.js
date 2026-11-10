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
    // 只采用浏览器明确提供的芯片信息，不把 Mac 的旧式 UA 当作 Intel。
    async function detectDevice() {
        const hints = navigator.userAgentData;
        if (!hints || hints.mobile || typeof hints.getHighEntropyValues !== 'function') return null;
        try {
            const { architecture, bitness } = await hints.getHighEntropyValues(['architecture', 'bitness']);
            if (bitness !== '64') return null;
            if (hints.platform === 'macOS' && architecture === 'arm') return 'mac';
            if (hints.platform === 'macOS' && architecture === 'x86') return 'mac-intel';
            if (hints.platform === 'Windows' && architecture === 'x86') return 'win';
        } catch { /* 浏览器未提供信息时让用户选择。 */ }
        return null;
    }

    function setupDownloadMenus() {
        const primaryLinks = document.querySelectorAll('[data-desktop-download-primary]');
        const sourceOptions = dialog.querySelectorAll('[data-download-os]');
        if (!primaryLinks.length || !sourceOptions.length) return;
        const menus = [];
        primaryLinks.forEach((primary, index) => {
            const wrap = document.createElement('div');
            wrap.className = 'desktop-download-choice';
            const inNavigation = !!primary.closest('header');
            if (inNavigation) wrap.classList.add('desktop-download-choice--nav');
            if (primary.classList.contains('lg:flex')) {
                primary.classList.remove('hidden', 'lg:flex');
                primary.classList.add('flex');
                wrap.classList.add('hidden', 'lg:flex');
            }
            primary.parentNode.insertBefore(wrap, primary);
            wrap.append(primary);
            primary.setAttribute('aria-disabled', 'true');
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'desktop-download-toggle';
            if (inNavigation) {
                toggle.setAttribute('aria-label', 'Choose a version');
                toggle.setAttribute('data-aria-label-key', 'download-select-version');
                toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
            } else {
                toggle.setAttribute('data-key', 'download-select-version');
                toggle.textContent = 'Choose a version';
            }
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-controls', `desktop-download-menu-${index}`);
            const menu = document.createElement('div');
            menu.id = `desktop-download-menu-${index}`;
            menu.className = 'desktop-download-menu';
            menu.hidden = true;
            sourceOptions.forEach(option => {
                const item = option.cloneNode(true);
                const status = item.querySelector('.download-dialog-action');
                status.className = 'desktop-download-current';
                status.setAttribute('data-key', 'download-current-device');
                status.textContent = 'Current device';
                status.hidden = true;
                menu.append(item);
            });
            wrap.append(toggle, menu);
            let restoringFocus = false;
            const setOpen = open => {
                menu.hidden = !open;
                toggle.setAttribute('aria-expanded', String(open));
                if (open) menus.forEach(other => { if (other.menu !== menu) other.close(); });
            };
            wrap.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') setOpen(true); });
            wrap.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch' && !wrap.contains(document.activeElement)) setOpen(false); });
            primary.addEventListener('focus', () => {
                if (!restoringFocus && primary.matches(':focus-visible')) setOpen(true);
            });
            wrap.addEventListener('focusout', event => { if (!wrap.contains(event.relatedTarget)) setOpen(false); });
            wrap.addEventListener('keydown', event => {
                if (event.key !== 'Escape' || menu.hidden) return;
                setOpen(false);
                restoringFocus = true;
                (toggle.hidden ? primary : toggle).focus();
                restoringFocus = false;
            });
            toggle.addEventListener('click', () => setOpen(menu.hidden));
            primary.addEventListener('click', event => {
                if (primary.hasAttribute('aria-disabled')) event.preventDefault();
            });
            menus.push({ primary, menu, toggle, close: () => setOpen(false) });
        });
        document.addEventListener('pointerdown', event => {
            menus.forEach(({ primary, close }) => { if (!primary.parentElement.contains(event.target)) close(); });
        });
        void detectDevice().then(platform => {
            if (!platform) return;
            menus.forEach(({ primary, menu, toggle }) => {
                primary.href = `https://chatmemo.ai/desktop/download/${platform}?link=website`;
                primary.removeAttribute('aria-disabled');
                if (!primary.closest('header')) toggle.classList.add('desktop-download-toggle--compact');
                menu.querySelector(`[data-download-os="${platform}"] .desktop-download-current`).hidden = false;
            });
        });
    }
    setupDownloadMenus();

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
