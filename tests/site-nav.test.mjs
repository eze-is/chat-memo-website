import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createNavigation() {
    const document = {
        activeElement: null,
        listeners: new Map(),
        addEventListener(type, listener) {
            const listeners = this.listeners.get(type) || [];
            listeners.push(listener);
            this.listeners.set(type, listeners);
        },
        fire(type, event) { this.listeners.get(type)?.forEach((listener) => listener(event)); },
        querySelector: (selector) => selector === '#navbar-container header' ? header : null
    };
    function element({ tagName = 'div', id = null, dataset = {}, classes = [], parent = null } = {}) {
        const attributes = new Map();
        const classNames = new Set(classes);
        const listeners = new Map();
        const node = {
            tagName,
            id,
            dataset,
            parentNode: parent,
            children: [],
            hidden: false,
            classList: {
                contains(name) { return classNames.has(name); },
                toggle(name, force) {
                    if (force ?? !classNames.has(name)) classNames.add(name);
                    else classNames.delete(name);
                }
            },
            setAttribute(name, value) { attributes.set(name, String(value)); },
            getAttribute(name) { return attributes.get(name) || null; },
            addEventListener(type, listener) {
                const existing = listeners.get(type) || [];
                existing.push(listener);
                listeners.set(type, existing);
            },
            fire(type, event = {}) { listeners.get(type)?.forEach((listener) => listener({ target: node, ...event })); },
            contains(target) {
                for (let current = target; current; current = current.parentNode) {
                    if (current === node) return true;
                }
                return false;
            },
            closest(selector) {
                for (let current = node; current; current = current.parentNode) {
                    if (selector === 'a' && current.tagName === 'a') return current;
                }
                return null;
            },
            focus() { document.activeElement = node; },
            querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
            querySelectorAll(selector) {
                const match = (child) => {
                    if (selector === 'path') return child.tagName === 'path';
                    if (selector.startsWith('#')) return child.id === selector.slice(1);
                    const data = selector.match(/^\[data-([a-z-]+)\]$/);
                    const property = data?.[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                    return property && Object.hasOwn(child.dataset, property);
                };
                const found = [];
                const visit = (current) => {
                    for (const child of current.children) {
                        if (match(child)) found.push(child);
                        visit(child);
                    }
                };
                visit(node);
                return found;
            }
        };
        parent?.children.push(node);
        return node;
    }

    const header = element();
    const mobileTrigger = element({ tagName: 'button', id: 'mobile-menu-button', parent: header });
    mobileTrigger.setAttribute('aria-expanded', 'false');
    const mobileIcon = element({ tagName: 'path', parent: mobileTrigger });
    const mobilePanel = element({ id: 'mobile-menu', classes: ['hidden'], parent: header });
    const mobileLink = element({ tagName: 'a', parent: mobilePanel });
    const localeMenu = element({ dataset: { siteLocaleMenu: '' }, parent: header });
    const localeTrigger = element({ tagName: 'button', dataset: { siteLocaleTrigger: '' }, parent: localeMenu });
    localeTrigger.setAttribute('aria-expanded', 'false');
    const localePanel = element({ dataset: { siteLocaleOptions: '' }, parent: localeMenu });
    localePanel.hidden = true;
    const localeOptions = Object.fromEntries(['zh-CN', 'en', 'ja', 'es'].map((locale) => [
        locale, element({ tagName: 'button', dataset: { siteLocaleOption: locale }, parent: localePanel })
    ]));
    const outside = element();
    const choices = [];
    let failChoice = false;
    const window = { SiteI18n: { choose(locale) { if (failChoice) throw new Error('bad locale'); choices.push(locale); } } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'site-nav.js'), 'utf8'), {
        window, document, console: { error: () => {} }
    });
    return {
        init: window.SiteNav.init,
        document, header, mobileTrigger, mobileIcon, mobilePanel, mobileLink,
        localeMenu, localeTrigger, localePanel, localeOptions, outside, choices,
        failNextChoice() { failChoice = true; }
    };
}

test('移动导航与语言菜单互斥，重复初始化不会重复绑定', () => {
    const ui = createNavigation();
    ui.init();
    ui.init();
    ui.mobileTrigger.fire('click');
    assert.equal(ui.mobilePanel.classList.contains('hidden'), false);
    assert.equal(ui.mobileTrigger.getAttribute('aria-expanded'), 'true');
    assert.equal(ui.mobileIcon.getAttribute('d'), 'M6 18L18 6M6 6l12 12');

    ui.localeTrigger.fire('click');
    assert.equal(ui.mobilePanel.classList.contains('hidden'), true);
    assert.equal(ui.mobileTrigger.getAttribute('aria-expanded'), 'false');
    assert.equal(ui.localePanel.hidden, false);
    assert.equal(ui.localeTrigger.getAttribute('aria-expanded'), 'true');

    ui.mobileTrigger.fire('click');
    assert.equal(ui.localePanel.hidden, true);
    assert.equal(ui.localeTrigger.getAttribute('aria-expanded'), 'false');
    assert.equal(ui.mobilePanel.classList.contains('hidden'), false);
    ui.mobilePanel.fire('click', { target: ui.mobileLink });
    assert.equal(ui.mobilePanel.classList.contains('hidden'), true);
});

test('Escape、外部点击及焦点移出关闭弹层，语言选项交给 SiteI18n.choose', () => {
    const ui = createNavigation();
    ui.init();
    ui.localeTrigger.fire('click');
    ui.document.fire('click', { target: ui.localeOptions.en });
    assert.equal(ui.localePanel.hidden, false, '菜单内部点击不关闭');
    ui.localeMenu.fire('focusout', { relatedTarget: ui.localeOptions.ja });
    assert.equal(ui.localePanel.hidden, false, '菜单内部切换焦点不关闭');
    ui.localeMenu.fire('focusout', { relatedTarget: ui.outside });
    assert.equal(ui.localePanel.hidden, true);

    ui.localeTrigger.fire('click');
    ui.header.fire('keydown', { key: 'Escape' });
    assert.equal(ui.localePanel.hidden, true);
    assert.equal(ui.document.activeElement, ui.localeTrigger);

    ui.localeTrigger.fire('click');
    ui.document.fire('click', { target: ui.outside });
    assert.equal(ui.localePanel.hidden, true);
    assert.equal(ui.localeTrigger.getAttribute('aria-expanded'), 'false');

    ui.mobileTrigger.fire('click');
    ui.header.fire('keydown', { key: 'Escape' });
    assert.equal(ui.mobilePanel.classList.contains('hidden'), true);
    assert.equal(ui.document.activeElement, ui.mobileTrigger);

    ui.mobileTrigger.fire('click');
    ui.document.fire('click', { target: ui.mobileTrigger });
    assert.equal(ui.mobilePanel.classList.contains('hidden'), false, '触发按钮点击不关闭移动导航');
    ui.document.fire('click', { target: ui.outside });
    assert.equal(ui.mobilePanel.classList.contains('hidden'), true, '外部点击关闭移动导航');
    assert.equal(ui.mobileTrigger.getAttribute('aria-expanded'), 'false');

    ui.mobileTrigger.fire('click');
    ui.header.fire('focusout', { relatedTarget: ui.mobileLink });
    assert.equal(ui.mobilePanel.classList.contains('hidden'), false, '页头内部移动焦点不关闭移动导航');
    ui.header.fire('focusout', { relatedTarget: ui.outside });
    assert.equal(ui.mobilePanel.classList.contains('hidden'), true, 'Tab 离开页头关闭移动导航');
    assert.equal(ui.mobileTrigger.getAttribute('aria-expanded'), 'false');

    ui.localeTrigger.fire('click');
    ui.localeOptions.es.fire('click');
    assert.deepEqual(ui.choices, ['es']);
    ui.failNextChoice();
    ui.localeOptions.ja.fire('click');
    assert.deepEqual(ui.choices, ['es']);
    assert.equal(ui.localePanel.hidden, true, '切换失败时也关闭弹层');
});
