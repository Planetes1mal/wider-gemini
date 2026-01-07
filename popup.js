// 国际化加载函数
function localizeHtmlPage() {
    // 替换所有带有 i18n- 前缀 ID 的元素文本
    const ids = [
        "appName", "headerSubtitle", "widthLabel", "btnNarrow", "btnDefault",
        "btnWider", "btnUltra", "btnInsane", "codeWrapLabel", "infoText1", "infoText2", "refreshing"
    ];
    
    ids.forEach(id => {
        const element = document.getElementById("i18n-" + id);
        if (element) {
            element.textContent = chrome.i18n.getMessage(id);
        }
    });
}

// 页面加载时调用国际化函数
localizeHtmlPage();

const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');
const presetButtons = document.querySelectorAll('.preset-btn');
const codeWrapToggle = document.getElementById('codeWrapToggle');
const codeWrapStatus = document.getElementById('codeWrapStatus');
const refreshNotice = document.getElementById('refreshNotice');

// 防抖定时器
let widthUpdateTimer = null;

// 显示刷新提示
function showRefreshNotice() {
    refreshNotice.classList.add('show');
    // 2秒后自动隐藏
    setTimeout(() => {
        refreshNotice.classList.remove('show');
    }, 2000);
}

// 隐藏刷新提示
function hideRefreshNotice() {
    refreshNotice.classList.remove('show');
}

// 加载已保存的设置
chrome.storage.sync.get(['chatWidth', 'codeWrap'], function (result) {
    const width = result.chatWidth || 1000;
    widthSlider.value = width;
    widthValue.textContent = width;

    // 加载代码换行设置
    const codeWrap = result.codeWrap !== undefined ? result.codeWrap : false;
    codeWrapToggle.checked = codeWrap;
    updateCodeWrapStatus(codeWrap);
});

// 滑块变化时更新显示和保存设置（使用防抖）
widthSlider.addEventListener('input', function () {
    const width = parseInt(this.value);
    widthValue.textContent = width;

    // 清除之前的定时器
    if (widthUpdateTimer) {
        clearTimeout(widthUpdateTimer);
    }

    // 延迟更新，避免拖动滑块时频繁刷新
    widthUpdateTimer = setTimeout(() => {
        updateWidth(width);
    }, 500); // 停止拖动0.5秒后才刷新
});

// 预设按钮点击事件
presetButtons.forEach(button => {
    button.addEventListener('click', function () {
        const width = parseInt(this.dataset.width);
        widthSlider.value = width;
        widthValue.textContent = width;
        updateWidth(width);
    });
});

// 代码换行开关事件
codeWrapToggle.addEventListener('change', function () {
    const enabled = this.checked;
    updateCodeWrapStatus(enabled);
    updateCodeWrap(enabled);
});

// 更新代码换行状态显示
function updateCodeWrapStatus(enabled) {
    const statusOn = chrome.i18n.getMessage("statusOn");
    const statusOff = chrome.i18n.getMessage("statusOff");
    codeWrapStatus.textContent = enabled ? statusOn : statusOff;
}

// 更新宽度
function updateWidth(width) {
    // 保存到存储
    chrome.storage.sync.set({ chatWidth: width });

    // 显示刷新提示
    showRefreshNotice();

    // 向所有Gemini标签页发送消息并刷新
    chrome.tabs.query({ url: 'https://gemini.google.com/*' }, function (tabs) {
        if (tabs.length === 0) {
            // 如果没有打开的Gemini标签页，隐藏提示
            hideRefreshNotice();
            return;
        }

        tabs.forEach(tab => {
            // 先发送消息
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateWidth',
                width: width
            }).catch(err => {
                // 忽略错误
            });

            // 延迟刷新页面，确保设置已保存
            setTimeout(() => {
                chrome.tabs.reload(tab.id);
            }, 100);
        });
    });
}

// 更新代码换行设置
function updateCodeWrap(enabled) {
    // 保存到存储
    chrome.storage.sync.set({ codeWrap: enabled });

    // 显示刷新提示
    showRefreshNotice();

    // 向所有Gemini标签页发送消息并刷新
    chrome.tabs.query({ url: 'https://gemini.google.com/*' }, function (tabs) {
        if (tabs.length === 0) {
            // 如果没有打开的Gemini标签页，隐藏提示
            hideRefreshNotice();
            return;
        }

        tabs.forEach(tab => {
            // 先发送消息
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateCodeWrap',
                enabled: enabled
            }).catch(err => {
                // 忽略错误
            });

            // 延迟刷新页面，确保设置已保存
            setTimeout(() => {
                chrome.tabs.reload(tab.id);
            }, 100);
        });
    });
}

