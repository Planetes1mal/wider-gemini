// 弹窗入口：读取设置、决定进入网站列表还是网站设置页、语言切换与返回。
// 在支持的网站上打开 → 该网站设置页；其它页面 → 网站列表。

const siteListView = document.getElementById('siteListView');
const siteView = document.getElementById('siteView');
const uiLanguageSelect = document.getElementById('uiLanguageSelect');

function showView(name) {
    siteListView.hidden = name !== 'list';
    siteView.hidden = name !== 'site';
    window.scrollTo(0, 0);
}

async function openSite(site) {
    if (!siteRegistry.get(site) || taskBusy) return;
    if (currentSite && currentSite !== site) {
        try {
            await flushPendingChanges();
        } catch (error) {
            return;
        }
    }
    currentSite = site;
    clearStatus();
    renderSite();
    showView('site');
    refreshLayoutStatus();
}

async function openSiteList() {
    try {
        await flushPendingChanges();
    } catch (error) {
        return;
    }
    currentSite = null;
    clearStatus();
    renderSiteList();
    showView('list');
}

document.getElementById('backToSites').addEventListener('click', openSiteList);
document.getElementById('introLine').addEventListener('click', openSiteList);

// ---- 初始化 ----

async function initializeSettings() {
    setTaskBusy(false);
    try {
        const keys = [...new Set(siteRegistry.sites.flatMap(site => settingsUtils.getSiteStorageKeys(site.id))), 'uiLanguage'];
        const [result, tabs, localValues, flags] = await Promise.all([
            chrome.storage.sync.get(keys),
            chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []),
            chrome.storage.local.get(Object.values(settingsUtils.TASK_UNDO_KEYS)).catch(() => ({})),
            takeIntroFlags(),
            Promise.all(siteRegistry.optional().map(async site => {
                granted[site.id] = await chrome.permissions.contains({ origins: site.matches });
            }))
        ]);
        storedSettings = result;
        introFlags = flags;
        for (const site of siteRegistry.sites) {
            siteSettings[site.id] = settingsUtils.normalizeSiteSettings(result, site.id);
        }
        await Promise.all(siteRegistry.sites.map(site => loadTaskUndo(site.id, localValues)));
        activeTabSite = getTabSite(tabs[0]);
        const params = new URLSearchParams(window.location.search);
        const savedSite = params.get('site');
        const requested = siteRegistry.get(savedSite) ? savedSite : params.get('view') === 'list' ? null : activeTabSite;

        // 语言、网站与存储全部就绪后才开放控件，避免初始状态闪烁或覆盖用户操作。
        const uiLanguage = settingsUtils.normalizeUiLanguage(result.uiLanguage);
        await loadLanguageDictionary(uiLanguage);
        localizeHtmlPage();
        const manifest = chrome.runtime.getManifest();
        document.getElementById('extensionVersion').textContent = manifest.version_name || manifest.version;
        uiLanguageSelect.value = uiLanguage;
        renderSiteList();
        if (requested) {
            currentSite = requested;
            renderSite();
            showView('site');
        } else {
            showView('list');
        }
        if (result.uiLanguage === undefined) {
            await enqueue(() => chrome.storage.sync.set({ uiLanguage }));
        }
        settingsLoaded = true;
        setTaskBusy(false);
        renderSiteList();
        refreshLayoutStatus();
    } catch (error) {
        console.error('[Roomy] Settings could not be loaded:', error);
        setStatus('error', t('saveFailed', 'Could not save. Please try again.'));
    }
}

initializeSettings();

uiLanguageSelect.addEventListener('change', async function () {
    const language = settingsUtils.normalizeUiLanguage(this.value);
    setTaskBusy(true);
    try {
        await flushPendingChanges();
        await enqueue(() => chrome.storage.sync.set({ uiLanguage: language }));
        // 保留当前页面（列表或某个网站），重新加载 popup 以全量重渲染新语言。
        const url = new URL(window.location.href);
        url.searchParams.delete('site');
        url.searchParams.delete('view');
        if (currentSite) url.searchParams.set('site', currentSite);
        else url.searchParams.set('view', 'list');
        window.location.replace(url.href);
    } catch (error) {
        setStatus('error', t('saveFailed', 'Could not save. Please try again.'));
        setTaskBusy(false);
    }
});
