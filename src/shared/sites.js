// @ts-check
// 站点注册表：扩展支持的每个网站在这里登记一条记录，弹窗、后台、设置层、帮助页和测试都从这里读取，
// 不再各自写死网站名。加一个新网站 = 这里一条记录 + 一个适配器文件 + 一套测试页面 + manifest 一行。
// 后台用 importScripts 读取，弹窗与帮助页用 <script>，页面端作为第一个注入文件，Node 测试用 vm 读取。
(function (global) {
    'use strict';

    /**
     * @typedef {Object} SiteStorageKeys
     * @property {string} enabled 站点总开关（storage.sync），只有显式 false 才暂停
     * @property {string} navigation 消息导航开关（storage.sync）
     * @property {string | null} width 宽度设置对象的键（storage.sync）；Gemini 用顶层键，为 null
     * @property {string | null} reading 阅读设置对象的键（storage.sync）；Gemini 用顶层键，为 null
     * @property {string} taskUndo 任务预设一步恢复记录（storage.local）
     * @property {string} intro 新网站提示标记（storage.local）
     */

    /**
     * @typedef {Object} Site
     * @property {string} id 小写英文，用于存储键与内部标识
     * @property {string} name 品牌名，不翻译
     * @property {string} url 帮助页与网站列表里“打开网站”的地址
     * @property {string[]} matches 匹配模式；一个网站可以有多个域名
     * @property {'required' | 'optional'} access 必需权限（只有 Gemini）或可选主机权限
     * @property {string} since 加入版本，决定哪些老用户看到 NEW 提示
     * @property {'core' | 'legacy'} runtime core = 公共内核 + 适配器；legacy = 迁移前的独立脚本
     * @property {'default' | 'gemini-legacy'} storage 存储编解码器：默认按命名规则，Gemini 用顶层键
     * @property {string[]} capabilities 弹窗只显示这些功能
     * @property {string[]} tasks 任务预设，定义在 settings-utils.js 的 TASK_DEFINITIONS
     * @property {{ js: string, css?: string }} [adapter] 内核网站的适配器文件
     * @property {{ js: string[], css: string[], loadedFlag: string, takeoverEvent: string }} [legacy] 独立脚本
     */

    const SHARED_JS = ['src/shared/sites.js', 'src/shared/settings-utils.js', 'src/content/message-navigation.js'];
    const SHARED_CSS = ['src/content/message-navigation.css'];
    // 内核文件顺序固定：runtime 先建立命名空间，适配器最后调用 defineSite。
    const CORE_JS = ['src/content/core/runtime.js', 'src/content/core/width.js', 'src/content/core/reading.js',
        'src/content/core/navigation.js'];
    const CORE_CSS = ['src/content/core/core.css'];
    const CORE_LOADED_FLAG = 'widerCoreContentLoaded';
    const CORE_TAKEOVER_EVENT = 'wider-core-takeover';
    const CAPABILITIES = ['width', 'navigation', 'reading', 'userFullWidth', 'codeWrap'];

    /** @type {Site[]} */
    const SITES = [
        {
            id: 'gemini',
            name: 'Gemini',
            url: 'https://gemini.google.com/',
            matches: ['https://gemini.google.com/*'],
            access: 'required',
            since: '1.0.0',
            runtime: 'legacy',
            storage: 'gemini-legacy',
            capabilities: ['width', 'navigation', 'reading', 'userFullWidth', 'codeWrap'],
            tasks: ['reading', 'table', 'code', 'large'],
            legacy: {
                js: [...SHARED_JS, 'src/content/gemini-content.js'],
                css: [...SHARED_CSS, 'src/content/gemini-content.css'],
                loadedFlag: 'widerGeminiContentLoaded',
                takeoverEvent: 'wider-gemini-takeover'
            }
        },
        {
            id: 'chatgpt',
            name: 'ChatGPT',
            url: 'https://chatgpt.com/',
            matches: ['https://chatgpt.com/*'],
            access: 'optional',
            since: '3.0.0',
            runtime: 'legacy',
            storage: 'default',
            capabilities: ['width', 'navigation', 'reading', 'userFullWidth'],
            tasks: ['reading', 'wide', 'large'],
            legacy: {
                js: [...SHARED_JS, 'src/content/chatgpt-content.js'],
                css: [...SHARED_CSS, 'src/content/chatgpt-content.css'],
                loadedFlag: 'widerChatgptContentLoaded',
                takeoverEvent: 'wider-chatgpt-takeover'
            }
        },
        {
            id: 'claude',
            name: 'Claude',
            url: 'https://claude.ai/',
            matches: ['https://claude.ai/*'],
            access: 'optional',
            since: '3.1.0',
            runtime: 'core',
            storage: 'default',
            capabilities: ['width', 'navigation', 'reading', 'userFullWidth'],
            tasks: ['reading', 'wide', 'large'],
            adapter: { js: 'src/content/sites/claude.js', css: 'src/content/sites/claude.css' }
        }
    ];

    const byId = Object.fromEntries(SITES.map(site => [site.id, site]));

    /** @param {string} id */
    function get(id) {
        return byId[id] || null;
    }

    function required() {
        return SITES.filter(site => site.access === 'required');
    }

    function optional() {
        return SITES.filter(site => site.access === 'optional');
    }

    /** 匹配模式只支持 https 的域名级通配：`https://host/*`。 */
    function matchesUrl(pattern, url) {
        const match = /^(https?):\/\/([^/]+)\/\*$/.exec(pattern);
        if (!match) return false;
        let parsed;
        try {
            parsed = new URL(url);
        } catch (e) {
            return false;
        }
        if (parsed.protocol !== `${match[1]}:`) return false;
        const host = match[2];
        if (host.startsWith('*.')) {
            const base = host.slice(2);
            return parsed.hostname === base || parsed.hostname.endsWith(`.${base}`);
        }
        return parsed.hostname === host;
    }

    /** @param {string | undefined} url */
    function forUrl(url) {
        if (!url) return null;
        return SITES.find(site => site.matches.some(pattern => matchesUrl(pattern, url))) || null;
    }

    /**
     * 存储键命名规则：`<id>Enabled`、`<id>MessageNavigationEnabled`、`<id>WidthSettings`、`<id>ReadingSettings`、
     * `<id>TaskPresetUndo`、`<id>IntroPending`。Gemini 的宽度与阅读设置是顶层键，由设置层的兼容编解码器处理。
     * @param {string} id
     * @returns {SiteStorageKeys}
     */
    function getStorageKeys(id) {
        const site = get(id);
        const legacy = site && site.storage === 'gemini-legacy';
        return {
            enabled: `${id}Enabled`,
            navigation: `${id}MessageNavigationEnabled`,
            width: legacy ? null : `${id}WidthSettings`,
            reading: legacy ? null : `${id}ReadingSettings`,
            taskUndo: legacy ? 'taskPresetUndo' : `${id}TaskPresetUndo`,
            intro: `${id}IntroPending`
        };
    }

    /** 内容脚本定义：声明式（必需网站，manifest）与运行时注册（可选网站）共用同一份文件清单。 */
    function getContentScript(id) {
        const site = get(id);
        if (!site) return null;
        const core = site.runtime === 'core';
        const adapter = site.adapter || { js: '', css: '' };
        return {
            id: `wider-${site.id}`,
            matches: [...site.matches],
            js: core ? [...SHARED_JS, ...CORE_JS, adapter.js] : [...site.legacy.js],
            css: core ? [...SHARED_CSS, ...CORE_CSS, ...(adapter.css ? [adapter.css] : [])] : [...site.legacy.css],
            runAt: 'document_start',
            persistAcrossSessions: true,
            loadedFlag: core ? CORE_LOADED_FLAG : site.legacy.loadedFlag
        };
    }

    /** 比较 x.y.z 版本：负数 a 更旧，正数 a 更新。缺失段按 0。 */
    function compareVersions(a, b) {
        const left = String(a || '').split('.').map(part => parseInt(part, 10) || 0);
        const right = String(b || '').split('.').map(part => parseInt(part, 10) || 0);
        for (let i = 0; i < Math.max(left.length, right.length); i++) {
            const delta = (left[i] || 0) - (right[i] || 0);
            if (delta) return delta;
        }
        return 0;
    }

    /** 从 previousVersion 更新后应提示的可选网站：加入版本晚于旧版本的那些。 */
    function addedSince(previousVersion) {
        return optional().filter(site => compareVersions(site.since, previousVersion) > 0);
    }

    /** 按界面语言把网站名连成一句（“Gemini、ChatGPT 和 Claude”）；不支持 Intl.ListFormat 时用逗号。 */
    function joinNames(names, language) {
        if (typeof Intl !== 'undefined' && typeof Intl.ListFormat === 'function') {
            try {
                return new Intl.ListFormat(language || undefined, { style: 'long', type: 'conjunction' }).format(names);
            } catch (e) {
                // 未知语言标签时退回逗号分隔。
            }
        }
        return names.join(', ');
    }

    global.widerRoomySites = {
        sites: SITES,
        CAPABILITIES,
        CORE_JS,
        CORE_CSS,
        CORE_LOADED_FLAG,
        CORE_TAKEOVER_EVENT,
        get,
        required,
        optional,
        matchesUrl,
        forUrl,
        getStorageKeys,
        getContentScript,
        compareVersions,
        addedSince,
        joinNames
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
