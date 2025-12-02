console.log('Chat Indexer Background Script Loaded');

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Also allow opening from any context
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
