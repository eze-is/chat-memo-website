// 发布等待提示独立于导航和 Hero，所有桌面版下载入口共用此弹窗。
(function () {
    'use strict';
    const dialog = document.getElementById('desktop-release-dialog');
    if (!dialog) return;
    let opener;

    document.addEventListener('click', event => {
        const trigger = event.target.closest('[data-desktop-release-pending]');
        if (!trigger) return;
        // 手机菜单在焦点进入弹窗时收起，关闭后返回仍可见的菜单入口。
        opener = trigger.closest('#mobile-menu') ? document.getElementById('mobile-menu-button') : trigger;
        dialog.showModal();
        document.documentElement.classList.add('download-notice-open');
    });
    dialog.addEventListener('click', event => {
        if (event.target.closest('[data-download-notice-close]')) dialog.close();
        if (event.target === dialog) {
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        }
    });
    dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('download-notice-open');
        opener?.focus();
        opener = null;
    });
})();
