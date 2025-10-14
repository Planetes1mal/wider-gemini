const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');
const presetButtons = document.querySelectorAll('.preset-btn');

// 加载已保存的宽度设置
chrome.storage.sync.get(['chatWidth'], function (result) {
    const width = result.chatWidth || 1000;
    widthSlider.value = width;
    widthValue.textContent = width;
});

// 滑块变化时更新显示和保存设置
widthSlider.addEventListener('input', function () {
    const width = parseInt(this.value);
    widthValue.textContent = width;
    updateWidth(width);
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

// 更新宽度
function updateWidth(width) {
    // 保存到存储
    chrome.storage.sync.set({ chatWidth: width });

    // 向所有Gemini标签页发送消息
    chrome.tabs.query({ url: 'https://gemini.google.com/*' }, function (tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateWidth',
                width: width
            }).catch(err => {
                // 忽略错误
            });
        });
    });
}

