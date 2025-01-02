let isDebugModeEnabled = false;

// 定义 debugLog 函数
function debugLog(...args) {
  if (isDebugModeEnabled) {
    console.log(...args);
  }
}

async function getUserSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['showMoreWait', 'afterExpandWait', 'minimalDisplay', 'debugMode'], items => {
      resolve({
        showMoreWait: parseInt(items.showMoreWait, 10) || 500,
        afterExpandWait: parseInt(items.afterExpandWait, 10) || 2000,
        minimalDisplay: !!items.minimalDisplay,
        debugMode: !!items.debugMode
      });
    });
  });
}

// 自动展开所有条目并点击 "Show more" 按钮直到没有更多文章加载
async function loadAllEntries(showMoreWait) {
  document.querySelectorAll('.gsc_a_expander').forEach(button => button.click());

  await new Promise(resolve => {
    function attemptClick() {
      const showMoreButton = document.getElementById('gsc_bpf_more');
      if (showMoreButton && !showMoreButton.disabled) {
        showMoreButton.click();
        debugLog(`Clicked 'Show more'. Waiting for ${showMoreWait} ms...`);
        setTimeout(attemptClick, showMoreWait);
      } else {
        debugLog("'Show more' button is either not found or disabled.");
        resolve();
      }
    }
    attemptClick();
  });
}

// 尝试从chrome.storage中获取用户设定的等待时间
chrome.storage.sync.get(['showMoreWaitTime', 'afterExpandWaitTime'], function(result) {
    if (result.showMoreWaitTime !== undefined) {
        defaultShowMoreWaitTime = parseInt(result.showMoreWaitTime, 10);
    }
    if (result.afterExpandWaitTime !== undefined) {
        defaultAfterExpandWaitTime = parseInt(result.afterExpandWaitTime, 10);
    }
});

// 自动展开 Google Scholar 的所有条目
function expandAll() {
  const expandButtons = document.querySelectorAll('.gsc_a_expander');
  expandButtons.forEach(button => button.click());
}

// 持续点击 "Show more" 按钮，并在所有文章加载完成后调用回调函数
function clickShowMore(callback) {
  chrome.storage.sync.get(['showMoreWait'], function(data) {
    const waitTime = parseInt(data.showMoreWait, 10) || 2000; // 默认2秒

    function attemptClick() {
      const showMoreButton = document.getElementById('gsc_bpf_more');

      if (showMoreButton && !showMoreButton.disabled) {
        showMoreButton.click();
        debugLog("Clicked 'Show more'. Waiting for " + waitTime + " ms before next click...");

        setTimeout(attemptClick, waitTime);
      } else {
        debugLog("'Show more' button is either not found or disabled. No more articles to load.");
        if (callback) callback();
      }
    }
    attemptClick();
  });
}

function getAuthorNameFormats() {
    const authorElement = document.getElementById('gsc_prf_in');
    const fullName = authorElement ? authorElement.textContent.trim() : '';

    debugLog("Original full name from element:", fullName);

    if (fullName) {
        // 正则表达式用于处理带有或不带括号的中间名或别名
        const namePattern = /^(\w+)(?:\s*\(([^)]+)\))?\s+(.*)$/;
        let firstName, middleName, lastName;

        // 检查是否有括号内的中间名或别名
        const match = fullName.match(namePattern);
        debugLog("Match result from regex:", match);

        if (match) {
            firstName = match[1]; // 第一个名字
            middleName = match[2] || null; // 括号中的中间名或别名
            lastName = match[3].trim(); // 姓氏

            // 如果没有括号内的名字，按空格分割名字
            if (!middleName) {
                const nameParts = fullName.split(/\s+/); // 使用正则表达式以适应多个连续空格
                firstName = nameParts[0];
                lastName = nameParts[nameParts.length - 1]; // 取最后一个作为姓氏
                middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null; // 中间部分作为中间名
            } else {
                debugLog("Found name in parentheses:", middleName);
            }
        } else {
            console.error("No match found for the full name.");
            return null;
        }

        debugLog("Parsed names: firstName =", firstName, ", middleName =", middleName, ", lastName =", lastName);

        // 创建所需的所有可能的第一作者格式
        const firstInitial = firstName.charAt(0).toUpperCase();
        const middleInitial = middleName ? middleName.charAt(0).toUpperCase() : '';

        // 格式一: 名首字母 + 姓氏
        const formattedName1 = `${firstInitial} ${lastName}`;
        
        // 格式二: 名首字母 + 中间名首字母（如果有）+ 姓氏
        const formattedName2 = middleName 
            ? `${firstInitial}${middleInitial} ${lastName}`
            : formattedName1;

        // 格式三: 名中间名首字母（如果有）+ 姓氏
        const formattedName3 = middleName 
            ? `${middleInitial} ${lastName}`
            : formattedName1;

        // 格式四: 中间名首字母（如果有）+ 名首字母 + 姓氏
        const formattedName4 = middleName 
            ? `${middleInitial}${firstInitial} ${lastName}`
            : formattedName1;
        
        // 格式三: 完整名 + 姓氏
        const formattedName5 = `${firstName} ${lastName}`;

        // 格式四: 完整中间名（如果有）+ 姓氏
        const formattedName6 = middleName 
            ? `${middleName} ${lastName}`
            : formattedName5;

        // 格式五: 完整名字
        const formattedName7 = middleName 
            ? `${firstName} ${middleName} ${lastName}`
            : formattedName5;

        debugLog("Generated formats:");
        debugLog(`Format 1: ${formattedName1}`);
        debugLog(`Format 2: ${formattedName2}`);
        debugLog(`Format 3: ${formattedName3}`);
        debugLog(`Format 4: ${formattedName4}`);
        debugLog(`Format 5: ${formattedName5}`);
        debugLog(`Format 6: ${formattedName6}`);
        debugLog(`Format 7: ${formattedName7}`);

        return { 
            format1: formattedName1,
            format2: formattedName2,
            format3: formattedName3,
            format4: formattedName4,
            format5: formattedName5
        };
    } else {
        console.error("Failed to retrieve a valid full name.");
    }
    
    return null;
}

// 计算符合条件的条目数量
function countCCFAEntries(formats) {
  let ccfACount = 0;
  let ccfAWithSelfAsFirstAuthorCount = 0;

  document.querySelectorAll('tr.gsc_a_tr').forEach(entry => {
    // 获取所有的 easyscholar-ranking span 元素
    const ccfATexts = entry.querySelectorAll('span.easyscholar-1.easyscholar-ranking');
    
    // 检查这些 span 元素中是否有文本包含 "CCF A"
    const isCCFA = Array.from(ccfATexts).some(text => text.textContent.includes('CCF A'));
    
    if (isCCFA) {
      ccfACount++;
      
      // 获取第一个作者的名字并进行匹配
      const authorsDiv = entry.querySelector('div.gs_gray'); // 获取包含作者的 div
      const firstAuthor = (authorsDiv?.textContent.trim().split(',')[0] || '').trim();
      
      // 如果第一作者的名字格式与当前作者名字格式之一相匹配，则计数增加
      if (firstAuthor && Object.values(formats).includes(firstAuthor)) {
        ccfAWithSelfAsFirstAuthorCount++;
      }
    }
  });

  return { ccfACount, ccfAWithSelfAsFirstAuthorCount };
}
// 获取总文章量，只考虑破折号（无论是"-"还是“–”）后的数字
function getTotalArticlesCount() {
  const matches = document.getElementById('gsc_a_nn')?.textContent.match(/[\-–]\s*(\d+)/);
  return matches ? parseInt(matches[1], 10) : 0;
}

// 显示结果
function displayResults({ ccfACount, ccfAWithSelfAsFirstAuthorCount, totalArticles }, minimalDisplay) {
  const resultDiv = document.createElement('div');
  resultDiv.style.marginTop = '10px';
  resultDiv.style.fontSize = '14px';
  resultDiv.style.fontWeight = 'bold';

  resultDiv.textContent = minimalDisplay 
    ? `${ccfAWithSelfAsFirstAuthorCount}/${ccfACount}/${totalArticles}`
    : `CCF A类论文中作为第一作者的数量: ${ccfAWithSelfAsFirstAuthorCount}; CCF A类论文总数: ${ccfACount}; 总论文数量: ${totalArticles}`;

  document.getElementById('gsc_prf_in')?.parentNode.insertBefore(resultDiv, document.getElementById('gsc_prf_in').nextSibling);
}

// 主函数
async function main() {
  const settings = await getUserSettings();
  isDebugModeEnabled = settings.debugMode;

  const currentAuthorNameFormats = getAuthorNameFormats();

  if (!currentAuthorNameFormats.format3) {
    debugLog("未能找到当前作者的名字");
    return;
  }

  await loadAllEntries(settings.showMoreWait);

  setTimeout(() => {
    const stats = countCCFAEntries(currentAuthorNameFormats);
    displayResults({ ...stats, totalArticles: getTotalArticlesCount() }, settings.minimalDisplay);
  }, settings.afterExpandWait);
}

// 执行主函数
main();