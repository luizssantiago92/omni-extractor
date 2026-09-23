chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_DATA_TABLE") {
    const url = chrome.runtime.getURL("data/table.html");
    chrome.tabs.create({ url }).then((tab) => sendResponse({ ok: true, tabId: tab.id })).catch((err) => {
      sendResponse({ ok: false, error: String(err) });
    });
    return true;
  }
  return false;
});
