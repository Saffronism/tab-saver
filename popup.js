/**
 * Tab Saver - Popup Script
 * Manages the extension popup UI and tab operations.
 *
 * @module popup
 */

/** @type {string} Storage key for saved tabs */
const STORAGE_KEY = 'savedTabs';

/** @type {Array<Object>} Cached saved tabs */
let savedTabs = [];

/**
 * Initialize the popup when DOM is ready.
 * @returns {void}
 */
document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

/**
 * Initialize popup state and event listeners.
 * @returns {Promise<void>}
 */
async function initializePopup() {
  setupEventListeners();
  await loadSavedTabs();
  updateUI();
}

/**
 * Set up all event listeners for popup buttons.
 * @returns {void}
 */
function setupEventListeners() {
  document.getElementById('saveAllBtn').addEventListener('click', handleSaveAll);
  document.getElementById('restoreAllBtn').addEventListener('click', handleRestoreAll);
  document.getElementById('clearAllBtn').addEventListener('click', handleClearAll);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
}

/**
 * Save all open tabs to storage.
 * @returns {Promise<void>}
 */
async function handleSaveAll() {
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
        savedAt: new Date().toISOString()
      }));

    if (tabData.length === 0) {
      showNotification('No tabs to save');
      return;
    }

    const existingTabs = await getStoredTabs();
    const updatedTabs = [...existingTabs, ...tabData];

    await chrome.storage.local.set({ [STORAGE_KEY]: updatedTabs });
    savedTabs = updatedTabs;

    // Close saved tabs
    const tabIds = tabs
      .filter((tab) => !tab.url.startsWith('chrome://'))
      .map((tab) => tab.id);
    await chrome.tabs.remove(tabIds);

    updateUI();
    showNotification(`Saved ${tabData.length} tabs`);
  } catch (error) {
    console.error('Error saving tabs:', error);
    showNotification('Failed to save tabs');
  }
}

/**
 * Restore all saved tabs.
 * @returns {Promise<void>}
 */
async function handleRestoreAll() {
  try {
    for (const tab of savedTabs) {
      await chrome.tabs.create({
        url: tab.url,
        active: false
      });
    }
    showNotification(`Restored ${savedTabs.length} tabs`);
  } catch (error) {
    console.error('Error restoring tabs:', error);
    showNotification('Failed to restore tabs');
  }
}

/**
 * Restore a single tab.
 * @param {string} tabId - ID of tab to restore
 * @returns {Promise<void>}
 */
async function restoreSingleTab(tabId) {
  try {
    const tab = savedTabs.find((t) => t.id === tabId);
    if (!tab) return;

    await chrome.tabs.create({ url: tab.url });

    // Remove from saved list
    savedTabs = savedTabs.filter((t) => t.id !== tabId);
    await chrome.storage.local.set({ [STORAGE_KEY]: savedTabs });

    updateUI();
  } catch (error) {
    console.error('Error restoring tab:', error);
    showNotification('Failed to restore tab');
  }
}

/**
 * Delete a single tab from saved list.
 * @param {string} tabId - ID of tab to delete
 * @returns {Promise<void>}
 */
async function deleteSingleTab(tabId) {
  try {
    savedTabs = savedTabs.filter((t) => t.id !== tabId);
    await chrome.storage.local.set({ [STORAGE_KEY]: savedTabs });
    updateUI();
  } catch (error) {
    console.error('Error deleting tab:', error);
    showNotification('Failed to delete tab');
  }
}

/**
 * Clear all saved tabs.
 * @returns {Promise<void>}
 */
async function handleClearAll() {
  try {
    if (!confirm('Delete all saved tabs?')) return;

    savedTabs = [];
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    updateUI();
    showNotification('All tabs cleared');
  } catch (error) {
    console.error('Error clearing tabs:', error);
    showNotification('Failed to clear tabs');
  }
}

/**
 * Filter tabs based on search input.
 * @param {Event} event - Input event
 * @returns {void}
 */
function handleSearch(event) {
  const query = event.target.value.toLowerCase();
  const filtered = savedTabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query)
  );
  renderTabList(filtered);
}

/**
 * Load saved tabs from storage.
 * @returns {Promise<void>}
 */
async function loadSavedTabs() {
  savedTabs = await getStoredTabs();
}

/**
 * Get stored tabs from Chrome storage.
 * @returns {Promise<Array<Object>>} Array of saved tabs
 */
async function getStoredTabs() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  } catch (error) {
    console.error('Error loading tabs:', error);
    return [];
  }
}

/**
 * Update UI based on current state.
 * @returns {void}
 */
function updateUI() {
  const count = savedTabs.length;
  document.getElementById('tabCount').textContent = `${count} tab${count !== 1 ? 's' : ''}`;

  const hasTabs = count > 0;
  document.getElementById('restoreAllBtn').disabled = !hasTabs;
  document.getElementById('clearAllBtn').disabled = !hasTabs;

  document.getElementById('emptyState').style.display = hasTabs ? 'none' : 'block';
  document.getElementById('tabList').style.display = hasTabs ? 'block' : 'none';

  renderTabList(savedTabs);
}

/**
 * Render the tab list.
 * @param {Array<Object>} tabs - Tabs to render
 * @returns {void}
 */
function renderTabList(tabs) {
  const list = document.getElementById('tabList');
  list.innerHTML = '';

  tabs.forEach((tab) => {
    const li = document.createElement('li');
    li.className = 'tab-item';
    li.innerHTML = `
      <div class="tab-favicon">
        ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="">` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`}
      </div>
      <div class="tab-info" title="${tab.title}\n${tab.url}">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
      </div>
      <div class="tab-actions">
        <button class="icon-btn restore-btn" title="Open tab">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
        <button class="icon-btn delete-btn" title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    li.querySelector('.restore-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      restoreSingleTab(tab.id);
    });

    li.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSingleTab(tab.id);
    });

    li.addEventListener('click', () => restoreSingleTab(tab.id));

    list.appendChild(li);
  });
}

/**
 * Escape HTML special characters.
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show a temporary notification.
 * @param {string} message - Message to display
 * @returns {void}
 */
function showNotification(message) {
  // Simple notification - could be enhanced
  console.log(message);
}
