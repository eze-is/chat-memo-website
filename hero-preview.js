// Hero只拥有两段展示的切换与播放许可；App内部编排由隔离的Renderer拥有。
(function () {
    'use strict';
    const root = document.querySelector('[data-hero-preview]');
    if (!root) return;
    const frame = root.querySelector('iframe');
    const controls = document.querySelector('[data-hero-tab-controls]');
    const tabs = [...controls.querySelectorAll('button[data-demo-tab]')];
    const video = root.querySelector('video');
    const pluginPoster = root.querySelector('[data-plugin-poster]');
    const desktop = document.getElementById('hero-desktop-download-btn');
    const plugin = document.querySelector('.hero-action-secondary .download-dropdown');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // 首屏和页尾共用菜单行为；只有首屏入口切换产品预览。
    document.querySelectorAll('.hero-actions .download-dropdown').forEach(dropdown => {
        const trigger = dropdown.querySelector('.hero-extension-trigger');
        const menu = dropdown.querySelector('.hero-extension-menu');
        function setMenu(open) { menu.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); }
        dropdown.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') setMenu(true); });
        dropdown.addEventListener('pointerleave', () => { if (!dropdown.contains(document.activeElement)) setMenu(false); });
        trigger.addEventListener('click', () => setMenu(menu.hidden));
        dropdown.addEventListener('focusout', event => { if (!dropdown.contains(event.relatedTarget)) setMenu(false); });
        dropdown.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); setMenu(false); trigger.focus(); } });
        document.addEventListener('click', event => { if (!dropdown.contains(event.target)) setMenu(false); });
    });

    let selected = 'desktop', visible = false, ready = false, hovering = false, closed = false, playRequest = 0;
    let activeTab = 'home', pendingTab = null;

    function syncTabs() {
        controls.setAttribute('aria-busy', String(pendingTab !== null));
        for (const button of tabs) {
            button.setAttribute('aria-pressed', String(selected === 'desktop' && button.dataset.demoTab === activeTab));
            button.toggleAttribute('data-pending', button.dataset.demoTab === pendingTab);
        }
    }
    function sendPendingTab() {
        if (ready && pendingTab) frame.contentWindow.postMessage({ type: 'chatmemo:hero:select-tab', tab: pendingTab }, location.origin);
    }

    function loadDesktop() {
        if (frame.hasAttribute('src')) return;
        const source = new URL(frame.dataset.src, location.href);
        source.searchParams.set('locale', document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en');
        frame.src = source.href;
    }
    function sync() {
        if (closed) return;
        const active = visible && !document.hidden && !reduced.matches;
        root.dataset.preview = selected;
        root.querySelector('[data-preview-desktop]').setAttribute('aria-hidden', String(selected !== 'desktop'));
        root.querySelector('[data-preview-plugin]').setAttribute('aria-hidden', String(selected !== 'plugin'));
        syncTabs();
        if (visible) loadDesktop();
        if (selected === 'plugin' && !pluginPoster.hasAttribute('src')) {
            pluginPoster.src = pluginPoster.dataset.src;
        }
        if (ready) frame.contentWindow.postMessage({ type: 'chatmemo:hero:playback', playing: active && selected === 'desktop' }, location.origin);
        const request = ++playRequest;
        if (active && selected === 'plugin' && !hovering) {
            video.preload = 'metadata';
            // 自动播放被浏览器拒绝时保留原视频封面；不影响页面和下载入口。
            const playing = video.play();
            playing?.then(() => { if (request !== playRequest && (closed || selected !== 'plugin' || document.hidden || !visible || hovering || reduced.matches)) video.pause(); }).catch(() => {});
        } else video.pause();
    }
    function select(value) { selected = value; sync(); }
    for (const button of tabs) {
        button.addEventListener('click', () => {
            pendingTab = button.dataset.demoTab;
            select('desktop');
            loadDesktop();
            sendPendingTab();
        });
    }
    controls.hidden = false;
    desktop.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') select('desktop'); });
    desktop.addEventListener('focus', () => select('desktop'));
    plugin.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') select('plugin'); });
    plugin.addEventListener('focusin', () => select('plugin'));
    root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; sync(); } });
    root.addEventListener('pointerleave', () => { hovering = false; sync(); });
    pluginPoster.addEventListener('load', () => { root.dataset.pluginReady = 'true'; });
    video.addEventListener('playing', () => {
        root.dataset.pluginReady = 'true';
        root.dataset.pluginPlaying = 'true';
    });
    addEventListener('message', event => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
        if (event.data?.type === 'chatmemo:hero:ready') {
            ready = true; root.dataset.desktopReady = 'true'; sync();
            sendPendingTab();
        } else if (event.data?.type === 'chatmemo:hero:tab' && tabs.some(button => button.dataset.demoTab === event.data.tab)) {
            activeTab = event.data.tab;
            if (pendingTab === activeTab) pendingTab = null;
            syncTabs();
        }
    });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    const observer = new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= .2; sync(); }, { threshold: [0, .2] });
    observer.observe(root);
    addEventListener('pagehide', () => { closed = true; ++playRequest; observer.disconnect(); video.pause(); if (ready) frame.contentWindow.postMessage({ type: 'chatmemo:hero:playback', playing: false }, location.origin); });
    addEventListener('pageshow', event => { if (event.persisted) { closed = false; observer.observe(root); sync(); } });
    sync();
})();
