// 弹窗的状态与写入队列：已存设置、每个网站的视图、任务恢复记录、授权状态、串行写入、
// 状态提示、向网站标签页发消息与页面状态查询。网站列表与设置页都只通过这里读写。
const settingsUtils = window.widerGeminiSettings;
const siteRegistry = window.widerRoomySites;
const DEFAULTS = settingsUtils.DEFAULTS;

let settingsLoaded = false;
let taskBusy = false;
// 当前打开的设置页所属网站；列表页时为 null。
let currentSite = null;
let activeTabSite = null;
let storedSettings = {};
const siteSettings = {};
const taskUndo = {};
// 可选网站的授权状态；必需网站恒为 true。
const granted = {};
// 本次打开弹窗时读取并清除的新网站提示：{ id: 'install' | 'update' }。
let introFlags = {};
let writeQueue = Promise.resolve();
let failedSinceFlush = false;
const latestSiteMessages = new Map();
let layoutStatusRequest = 0;

function siteName(id) {
    const site = siteRegistry.get(id);
    return site ? site.name : id;
}

function isGranted(id) {
    const site = siteRegistry.get(id);
    return Boolean(site) && (site.access === 'required' || granted[id] === true);
}

// 提示过的、尚未授权的新网站（新装的标记不算“新”）。
function introSites() {
    return siteRegistry.optional().filter(site => introFlags[site.id] === 'update' && !isGranted(site.id)).map(site => site.id);
}

// ---- 状态提示：同一位置按优先级显示——保存失败 > 页面/协议问题 > 短暂提示。 ----

const statusMessages = { error: '', page: '', transient: '' };

function renderStatus() {
    const kind = ['error', 'page', 'transient'].find(key => statusMessages[key]);
    const target = currentSite ? document.getElementById('siteStatus') : document.getElementById('listStatus');
    for (const element of [document.getElementById('siteStatus'), document.getElementById('listStatus')]) {
        const own = element === target && kind;
        element.textContent = own ? statusMessages[kind] : '';
        element.dataset.kind = own ? kind : '';
        element.hidden = !own;
    }
}

function setStatus(kind, message) {
    statusMessages[kind] = message || '';
    if (kind === 'transient') {
        clearTimeout(setStatus.timer);
        if (message) setStatus.timer = setTimeout(() => setStatus('transient', ''), 2400);
    }
    renderStatus();
}

function clearStatus() {
    statusMessages.error = '';
    statusMessages.transient = '';
    statusMessages.page = '';
    renderStatus();
}

// ---- 存储写入：串行执行；站点与数值在入队时确定。 ----

function enqueue(operation) {
    const run = writeQueue.then(operation);
    writeQueue = run.catch(() => {});
    return run;
}

function onSaved(site) {
    siteSettings[site] = settingsUtils.normalizeSiteSettings(storedSettings, site);
    renderSiteRow(site);
    if (site !== currentSite) return;
    setStatus('error', '');
    if (!siteSettings[site].siteEnabled) setStatus('transient', t('savedWhilePaused', 'Saved. Applies when enabled.'));
}

// 写入失败时显示错误，并按存储中最后一次确认的值重新渲染控件。
async function onSaveFailed(site, error) {
    console.error('[Roomy] Settings could not be saved:', error);
    failedSinceFlush = true;
    try {
        Object.assign(storedSettings, await chrome.storage.sync.get(settingsUtils.getSiteStorageKeys(site)));
    } catch (e) {
        // 读取也失败时保留当前视图，错误提示仍然准确。
    }
    siteSettings[site] = settingsUtils.normalizeSiteSettings(storedSettings, site);
    renderSiteRow(site);
    if (site === currentSite) renderSite();
    setStatus('error', t('saveFailed', 'Could not save. Please try again.'));
}

function writePatch(site, buildPatch, message) {
    return enqueue(async () => {
        const patch = await buildPatch();
        await chrome.storage.sync.set(patch);
        Object.assign(storedSettings, patch);
    }).then(() => {
        onSaved(site);
        if (message) notifySiteTabs(site, message);
    }, error => onSaveFailed(site, error));
}

async function readSite(site) {
    const stored = await chrome.storage.sync.get(settingsUtils.getSiteStorageKeys(site));
    Object.assign(storedSettings, stored);
    return stored;
}

// ---- 页面通知与状态 ----

function isNoReceiver(error) {
    return /Receiving end does not exist/i.test(error && error.message || String(error));
}

async function reportOutdatedPage(site, tabId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
    if (site === currentSite && tab && tab.id === tabId) {
        setStatus('page', t('pageOutdated', 'Saved, but this page runs an older extension version.'));
    }
}

function siteTabs(site) {
    const record = siteRegistry.get(site);
    if (!record) return Promise.resolve([]);
    const permitted = record.access === 'required'
        ? Promise.resolve(true)
        : chrome.permissions.contains({ origins: record.matches });
    return permitted.then(ok => (ok ? chrome.tabs.query({ url: record.matches }) : []));
}

// 消息目标在提交时固定。宽度消息保留原有的“缺少内容脚本则刷新”回退；
// v2 消息不会自动刷新页面，旧版内容脚本只提示当前页尚未更新。
function notifySiteTabs(site, message) {
    const v2 = message.action === 'updateSiteEnabled' || message.action === 'updateReadingSettings' ||
        message.action === 'refreshSettings';
    const key = `${site}:${message.action === 'updateWidthSetting' ? 'width' : message.action}`;
    latestSiteMessages.set(key, message);
    return siteTabs(site).then(tabs => {
        if (latestSiteMessages.get(key) !== message) return;
        return Promise.all(tabs.map(tab => {
            if (tab.discarded) return;
            return chrome.tabs.sendMessage(tab.id, message).then(response => {
                if (v2 && !(response && response.protocolVersion >= settingsUtils.PROTOCOL_VERSION)) {
                    return reportOutdatedPage(site, tab.id);
                }
            }, error => {
                if (v2) {
                    if (!isNoReceiver(error)) return reportOutdatedPage(site, tab.id);
                } else if (isNoReceiver(error)) {
                    showRefreshNotice();
                    chrome.tabs.reload(tab.id).catch(() => {});
                }
            });
        }));
    }).then(() => {
        if (site === currentSite) refreshLayoutStatus();
    }).catch(error => console.error('[Roomy] Could not query site tabs:', error));
}

function hasReadingEffect(settings) {
    return settings.messageFontSize !== 100 || settings.messageCompactness > 0 ||
        settings.messageSpacingCustom || settings.userFullWidth;
}

function getTabSite(tab) {
    const site = siteRegistry.forUrl(tab && tab.url);
    return site ? site.id : null;
}

// 只报告当前标签页的状态；切换网站或较慢的旧响应不会把别的页面标成未适配。
async function refreshLayoutStatus() {
    const request = ++layoutStatusRequest;
    const site = currentSite;
    if (!site || !isGranted(site)) {
        setStatus('page', '');
        return;
    }
    try {
        await writeQueue;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (request !== layoutStatusRequest || site !== currentSite) return;
        if (getTabSite(tab) !== site) {
            setStatus('page', '');
            return;
        }
        let message = '';
        try {
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'getLayoutStatus' });
            if (!result || result.site !== site) return;
            // 缺少 capabilities 的内容脚本来自不支持消息导航的旧版本。
            if (!(result.protocolVersion >= settingsUtils.PROTOCOL_VERSION) ||
                (!result.capabilities && siteSettings[site].navigationEnabled)) {
                message = t('pageOutdated', 'Saved, but this page runs an older extension version.');
            } else if (result.siteEnabled && result.widthEnabled) {
                message = { unsupported: t('layoutUnsupported'), loading: t('layoutLoading'),
                    notApplicable: t('layoutNotApplicable') }[result.status] || '';
            }
            // 宽度正常但消息结构未识别时，阅读设置不会生效；只在设置了非默认阅读效果时提示。
            if (!message && result.siteEnabled && result.reading && result.reading.status === 'unsupported' &&
                hasReadingEffect(siteSettings[site])) {
                message = t('readingUnsupported', 'Message layout not recognized; font size and spacing are not applied.');
            }
        } catch (error) {
            message = t('layoutUnavailable', 'Page status unavailable. Refresh the page and try again.');
        }
        if (request === layoutStatusRequest && site === currentSite) setStatus('page', message);
    } catch (error) {
        // 标签页查询失败时不显示页面状态。
    }
}

function showRefreshNotice() {
    const refreshNotice = document.getElementById('refreshNotice');
    refreshNotice.classList.add('show');
    setTimeout(() => {
        refreshNotice.classList.remove('show');
    }, 2000);
}

// ---- 授权与新网站提示 ----

// 读取后立即清除标记和工具栏角标：提示只在这次打开时出现，之后保留列表里的“允许”入口。
async function takeIntroFlags() {
    const keys = siteRegistry.optional().map(site => settingsUtils.SITE_INTRO_KEYS[site.id]);
    const stored = await chrome.storage.local.get(keys).catch(() => ({}));
    const flags = {};
    for (const site of siteRegistry.optional()) {
        const value = stored[settingsUtils.SITE_INTRO_KEYS[site.id]];
        if (value) flags[site.id] = value === 'install' ? 'install' : 'update';
    }
    const present = keys.filter(key => stored[key]);
    if (present.length) {
        await chrome.storage.local.remove(present).catch(() => {});
        await chrome.action.setBadgeText({ text: '' }).catch(() => {});
    }
    return flags;
}

async function refreshPermissions() {
    await Promise.all(siteRegistry.optional().map(async site => {
        granted[site.id] = await chrome.permissions.contains({ origins: site.matches });
    }));
    renderSiteList();
    if (currentSite) renderPermission();
    refreshLayoutStatus();
}

// request 必须直接进入点击的同步调用链，不能先等待设置写入。
function requestSiteAccess(site, button) {
    const record = siteRegistry.get(site);
    if (!record || record.access !== 'optional') return;
    const request = chrome.permissions.request({ origins: record.matches });
    button.disabled = true;
    request.then(refreshPermissions).catch(error => {
        console.error(`[Roomy] Could not request ${record.name} permission:`, error);
        setStatus('error', t('sitePermissionFailed', 'Could not request access. Please try again.'));
    }).finally(() => { button.disabled = false; });
}

chrome.permissions.onAdded.addListener(refreshPermissions);
chrome.permissions.onRemoved.addListener(refreshPermissions);
