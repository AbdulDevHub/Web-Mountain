// Listen for extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

// Listen for Alt+E keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-extension') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  }
});