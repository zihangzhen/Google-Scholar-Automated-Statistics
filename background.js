// background.js 可以为空，或者包含其他逻辑，如：
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});