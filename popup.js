document.addEventListener('DOMContentLoaded', function () {
  loadSettings();

  document.getElementById('save').addEventListener('click', saveSettings);
});

function loadSettings() {
  chrome.storage.sync.get(['showMoreWait', 'afterExpandWait', 'minimalDisplay', 'debugMode'], function(data) {
    document.getElementById('showMoreWait').value = data.showMoreWait || 500;
    document.getElementById('afterExpandWait').value = data.afterExpandWait || 2000;
    document.getElementById('minimalDisplay').checked = !!data.minimalDisplay;
    document.getElementById('debug-checkbox').checked = !!data.debugMode; // 加载调试模式状态
  });
}

function saveSettings() {
  const showMoreWait = document.getElementById('showMoreWait').value;
  const afterExpandWait = document.getElementById('afterExpandWait').value;
  const minimalDisplay = document.getElementById('minimalDisplay').checked;
  const debugMode = document.getElementById('debug-checkbox').checked; // 获取调试模式状态

  chrome.storage.sync.set({
    showMoreWait: showMoreWait,
    afterExpandWait: afterExpandWait,
    minimalDisplay: minimalDisplay,
    debugMode: debugMode // 保存调试模式状态
  }, function() {
    console.log('Settings saved.');
  });

  // Optionally reload the active tab to apply changes immediately.
  chrome.tabs.reload();
}