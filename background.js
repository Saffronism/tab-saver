/**
 * Tab Saver - Background Service Worker
 * Handles extension lifecycle events and background tasks.
 *
 * @module background
 */

/**
 * Initialize extension on install.
 * @returns {void}
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Saver extension installed');
  initializeStorage();
});

/**
 * Initialize default storage structure.
 * @returns {Promise<void>}
 */
async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get('savedTabs');
    if (!result.savedTabs) {
      await chrome.storage.local.set({ savedTabs: [] });
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

/**
 * Handle keyboard shortcuts.
 * @param {string} command - The command name
 * @returns {void}
 */
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-all-tabs') {
    saveAllTabs();
  }
});

/**
 * Save all tabs programmatically.
 * @returns {Promise<void>}
 */
async function saveAllTabs() {
  try {
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      pinned: false
    });

    const tabData = tabs
      .filter((tab) => !tab.url.startsWith('chrome://'))
      .map((tab) => ({
        id: Date.now() + Math.random(),
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl || '',
        savedAt: new Date().toISOString(),
        category: 'UNCATEGORIZED',
        formType: null,
        deadline: null
      }));

    if (tabData.length === 0) return;

    const result = await chrome.storage.local.get('savedTabs');
    const existingTabs = result.savedTabs || [];
    const updatedTabs = [...existingTabs, ...tabData];

    await chrome.storage.local.set({ savedTabs: updatedTabs });

    // Close saved tabs
    const tabIds = tabs
      .filter((tab) => !tab.url.startsWith('chrome://'))
      .map((tab) => tab.id);
    await chrome.tabs.remove(tabIds);
  } catch (error) {
    console.error('Error in background save:', error);
  }
}
