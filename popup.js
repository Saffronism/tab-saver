/**
 * Tab Saver - Popup Script
 * Manages the extension popup UI and tab operations.
 *
 * @module popup
 */

/** @type {string} Storage key for saved tabs */
const STORAGE_KEY = 'savedTabs';

/** @type {string} Storage key for pinned tabs */
const PINNED_STORAGE_KEY = 'pinnedTabs';

/** @type {Array<Object>} Cached saved tabs */
let savedTabs = [];

/** @type {Array<Object>} Cached pinned tabs */
let pinnedTabs = [];

/** @type {Object} Tab categories */
const CATEGORIES = {
  APPLICATIONS: { name: 'Applications & Forms', color: '#ef4444', priority: 1 },
  AI: { name: 'AI', color: '#8b5cf6', priority: 2 },
  WORK: { name: 'Work', color: '#3b82f6', priority: 3 },
  SOCIAL: { name: 'Social', color: '#10b981', priority: 4 },
  ENTERTAINMENT: { name: 'Entertainment', color: '#f59e0b', priority: 5 },
  SHOPPING: { name: 'Shopping', color: '#ec4899', priority: 6 },
  NEWS: { name: 'News', color: '#64748b', priority: 7 },
  TECH: { name: 'Tech', color: '#06b6d4', priority: 8 },
  EDUCATION: { name: 'Education', color: '#84cc16', priority: 9 },
  REFERENCE: { name: 'Reference', color: '#64748b', priority: 10 },
  UNCATEGORIZED: { name: 'Other', color: '#94a3b8', priority: 11 }
};

/** @type {Object} Form/Application detection patterns */
const FORM_PATTERNS = {
  job: ['job application', 'apply', 'career', 'employment', 'resume', 'cover letter', 'job opening', 'hiring', 'position', 'applicant', 'opportunity'],
  school: ['college application', 'university application', 'admission', 'enrollment', 'scholarship', 'financial aid', 'fafsa', 'degree program'],
  visa: ['visa application', 'passport', 'immigration', 'travel permit', 'citizenship', 'consulate', 'embassy'],
  tax: ['tax form', 'tax return', 'irs', 'tax filing', 'w-2', '1099', 'tax refund'],
  medical: ['medical form', 'patient form', 'health form', 'insurance claim', 'medical history', 'consent form'],
  legal: ['legal form', 'contract', 'agreement', 'legal document', 'nda', 'waiver', 'liability', 'terms of service', 'privacy policy update'],
  government: ['government form', 'dmv', 'social security', 'benefits', 'permit', 'license renewal', 'voter registration'],
  banking: ['bank application', 'loan application', 'credit card', 'account opening', 'mortgage application', 'financing'],
  housing: ['rental application', 'lease', 'housing form', 'apartment application', 'tenant application', 'sublet', 'roommate'],
  general_application: ['registration form', 'sign up form', 'join waitlist', 'waitlist', 'early access', 'apply now', 'submit application', 'call for papers', 'cfp', 'submission form', 'grant application']
};

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
  await loadPinnedTabs();
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
  document.getElementById('feedbackBtn').addEventListener('click', handleFeedback);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('searchToggle').addEventListener('click', toggleSearch);
  
  // Tab navigation
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });
}

/**
 * Save all open tabs to storage, prioritizing forms and applications.
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
        savedAt: new Date().toISOString(),
        category: 'UNCATEGORIZED',
        formType: null,
        deadline: null
      }));

    if (tabData.length === 0) {
      showNotification('No tabs to save');
      return;
    }

    // Categorize tabs and detect forms
    const categorizedTabs = await categorizeTabs(tabData);
    
    // Prioritize forms and applications with deadlines
    const priorityTabs = categorizedTabs.filter(tab => 
      tab.category === 'APPLICATIONS' || tab.deadline
    );
    const regularTabs = categorizedTabs.filter(tab => 
      tab.category !== 'APPLICATIONS' && !tab.deadline
    );
    
    // Show priority notification
    if (priorityTabs.length > 0) {
      const deadlineCount = priorityTabs.filter(tab => tab.deadline).length;
      const formCount = priorityTabs.length - deadlineCount;
      let priorityMsg = `Saved ${priorityTabs.length} important tab${priorityTabs.length !== 1 ? 's' : ''}`;
      if (deadlineCount > 0) priorityMsg += ` (${deadlineCount} with deadline${deadlineCount !== 1 ? 's' : ''})`;
      if (formCount > 0) priorityMsg += ` (${formCount} form${formCount !== 1 ? 's' : ''})`;
      showNotification(priorityMsg);
    } else {
      showNotification(`Saved ${tabData.length} tabs`);
    }

    const existingTabs = await getStoredTabs();
    const updatedTabs = [...existingTabs, ...categorizedTabs];

    await chrome.storage.local.set({ [STORAGE_KEY]: updatedTabs });
    savedTabs = updatedTabs;

    // Close saved tabs
    const tabIds = tabs
      .filter((tab) => !tab.url.startsWith('chrome://'))
      .map((tab) => tab.id);
    await chrome.tabs.remove(tabIds);

    updateUI();
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
    const tabsToRestore = [...savedTabs];
    
    // Clear from storage first before popup potentially closes
    savedTabs = [];
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    updateUI();

    for (const tab of tabsToRestore) {
      await chrome.tabs.create({
        url: tab.url,
        active: false
      });
    }
    showNotification(`Restored ${tabsToRestore.length} tabs`);
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

    // Remove from saved list first before popup potentially closes
    savedTabs = savedTabs.filter((t) => t.id !== tabId);
    await chrome.storage.local.set({ [STORAGE_KEY]: savedTabs });

    updateUI();
    
    // Create tab last, as this will typically close the popup
    await chrome.tabs.create({ url: tab.url });
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
 * Pin a tab to the pinned list for permanent reference.
 * @param {string} tabId - ID of tab to pin
 * @returns {Promise<void>}
 */
async function pinTab(tabId) {
  try {
    const tab = savedTabs.find((t) => t.id === tabId);
    if (!tab) return;
    
    // Check if already pinned
    if (pinnedTabs.some((t) => t.url === tab.url)) {
      showNotification('Tab already pinned');
      return;
    }
    
    // Add to pinned tabs
    const pinnedTab = {
      ...tab,
      id: Date.now() + Math.random(),
      pinnedAt: new Date().toISOString()
    };
    pinnedTabs.push(pinnedTab);
    await chrome.storage.local.set({ [PINNED_STORAGE_KEY]: pinnedTabs });
    
    showNotification('Tab pinned');
    renderPinnedTabs();
  } catch (error) {
    console.error('Error pinning tab:', error);
    showNotification('Failed to pin tab');
  }
}

/**
 * Unpin a tab from the pinned list.
 * @param {string} tabId - ID of tab to unpin
 * @returns {Promise<void>}
 */
async function unpinTab(tabId) {
  try {
    pinnedTabs = pinnedTabs.filter((t) => t.id !== tabId);
    await chrome.storage.local.set({ [PINNED_STORAGE_KEY]: pinnedTabs });
    showNotification('Tab unpinned');
    renderPinnedTabs();
  } catch (error) {
    console.error('Error unpinning tab:', error);
    showNotification('Failed to unpin tab');
  }
}

/**
 * Open a pinned tab in a new browser tab.
 * @param {string} tabId - ID of pinned tab to open
 * @returns {Promise<void>}
 */
async function openPinnedTab(tabId) {
  try {
    const tab = pinnedTabs.find((t) => t.id === tabId);
    if (!tab) return;
    await chrome.tabs.create({ url: tab.url });
  } catch (error) {
    console.error('Error opening pinned tab:', error);
    showNotification('Failed to open tab');
  }
}

/**
 * Render pinned tabs list with categories.
 * @returns {void}
 */
function renderPinnedTabs() {
  const container = document.getElementById('pinnedCategories');
  const emptyState = document.getElementById('pinnedEmptyState');
  
  if (pinnedTabs.length === 0) {
    emptyState.style.display = 'block';
    container.innerHTML = '';
    return;
  }
  
  emptyState.style.display = 'none';
  container.innerHTML = '';
  
  // Categorize pinned tabs (apply categorization if missing)
  const categorizedPinned = pinnedTabs.map(tab => {
    if (tab.category && tab.category !== 'UNCATEGORIZED') return tab;
    // Re-categorize using the same logic
    const formInfo = detectForm(tab);
    if (formInfo.isForm) {
      return { ...tab, category: 'APPLICATIONS', formType: formInfo.formType, deadline: formInfo.deadline };
    }
    const domain = extractDomain(tab.url);
    for (const [pattern, category] of Object.entries(DOMAIN_CATEGORIES)) {
      if (domain === pattern || domain.endsWith(pattern) || domain.includes(pattern)) {
        return { ...tab, category };
      }
    }
    const text = `${tab.title.toLowerCase()} ${tab.url.toLowerCase()}`;
    // Apply same keyword logic - AI first
    if (text.includes('claude') || text.includes('gpt') || text.includes('chatgpt') ||
        text.includes('openai') || text.includes('anthropic') || text.includes('x.ai') ||
        text.includes('xai') || text.includes('grok') || text.includes('perplexity') ||
        text.includes('midjourney') || text.includes('stable diffusion') || text.includes('runway') ||
        text.includes('huggingface') || text.includes('llm') || text.includes('large language model') ||
        text.includes('prompt') || text.includes('prompts') || text.includes('agent') ||
        text.includes('agents') || text.includes('agentic') || text.includes('autonomous') ||
        text.includes('cursor') || text.includes('windsurf') || text.includes('copilot') ||
        text.includes('tabnine') || text.includes('aider') || text.includes('replit') ||
        text.includes('bolt.new') || text.includes('v0.dev') || text.includes('zed') ||
        text.includes('artificial intelligence') || text.includes('machine learning') ||
        text.includes('deep learning') || text.includes('neural network') || text.includes('transformer') ||
        text.includes('generative ai') || text.includes('genai') || text.includes('gen ai') ||
        text.includes('ai model') || text.includes('ai tool') || text.includes('ai assistant') ||
        text.includes('chatbot') || text.includes('conversation ai') || text.includes('nlp') ||
        text.includes('natural language') || text.includes('computer vision') || text.includes('image generation') ||
        text.includes('text generation') || text.includes('code generation') || text.includes('skill.md') ||
        text.includes('glm') || text.includes('zhipu') || text.includes('qwen') || text.includes('llama') ||
        text.includes('mistral') || text.includes('gemini') || text.includes('bard') ||
        text.includes('deepseek') || text.includes('yi') || text.includes('moonshot') ||
        text.includes('kimi') || text.includes('doubao') || text.includes('ernie') ||
        text.includes('palm') || text.includes('falcon') || text.includes('vicuna') ||
        text.includes('alpaca') || text.includes('stablelm') || text.includes('dolly')) {
      return { ...tab, category: 'AI' };
    }
    // Tech keywords
    if (text.includes('github') || text.includes('stackoverflow') || text.includes('code') || text.includes('dev') ||
        text.includes('terminal') || text.includes('console') || text.includes('product') || text.includes('pricing') ||
        text.includes('features') || text.includes('platform') || text.includes('software') || text.includes('app') ||
        text.includes('api') || text.includes('sdk') || text.includes('saas') || text.includes('startup') ||
        text.includes('tech') || text.includes('cloud') || text.includes('data') ||
        text.includes('framework') || text.includes('library') || text.includes('developer') || text.includes('documentation') ||
        text.includes('git') || text.includes('programming') || text.includes('javascript') || text.includes('python') ||
        text.includes('react') || text.includes('node') || text.includes('typescript') || text.includes('rust') ||
        text.includes('golang') || text.includes('open source')) {
      return { ...tab, category: 'TECH' };
    }
    if (text.includes('facebook') || text.includes('twitter') || text.includes('instagram') || text.includes('linkedin') ||
        text.includes('social') || text.includes('profile')) {
      return { ...tab, category: 'SOCIAL' };
    }
    if (text.includes('youtube') || text.includes('netflix') || text.includes('twitch') || text.includes('reddit') ||
        text.includes('spotify') || text.includes('music') || text.includes('video') || text.includes('movie') ||
        text.includes('game') || text.includes('play') || text.includes('entertainment')) {
      return { ...tab, category: 'ENTERTAINMENT' };
    }
    if (text.includes('amazon') || text.includes('shop') || text.includes('buy') || text.includes('cart') ||
        text.includes('checkout') || text.includes('order') || text.includes('price') || text.includes('store')) {
      return { ...tab, category: 'SHOPPING' };
    }
    if (text.includes('news') || text.includes('bbc') || text.includes('cnn') || text.includes('times') ||
        text.includes('breaking') || text.includes('headline') || text.includes('latest') || text.includes('/news/')) {
      return { ...tab, category: 'NEWS' };
    }
    if (text.includes('work') || text.includes('office') || text.includes('slack') || text.includes('teams') ||
        text.includes('meeting') || text.includes('calendar') || text.includes('email') || text.includes('inbox') ||
        text.includes('document') || text.includes('spreadsheet') || text.includes('presentation') || text.includes('project')) {
      return { ...tab, category: 'WORK' };
    }
    if (text.includes('learn') || text.includes('course') || text.includes('tutorial') || text.includes('edu') ||
        text.includes('training') || text.includes('class') || text.includes('lesson') || text.includes('education')) {
      return { ...tab, category: 'EDUCATION' };
    }
    if (text.includes('wiki') || text.includes('docs') || text.includes('documentation') || text.includes('reference') ||
        text.includes('dictionary') || text.includes('encyclopedia')) {
      return { ...tab, category: 'REFERENCE' };
    }
    return { ...tab, category: 'UNCATEGORIZED' };
  });
  
  const grouped = groupTabsByCategory(categorizedPinned);
  const sortedCategories = getSortedCategories();
  
  // Render each category in priority order
  sortedCategories.forEach(categoryKey => {
    const categoryTabs = grouped[categoryKey];
    if (categoryTabs.length === 0) return;
    
    const category = CATEGORIES[categoryKey];
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';
    categoryDiv.innerHTML = `
      <div class="category-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="category-toggle">▼</span>
          <span class="category-name">${category.name}</span>
        </div>
        <span class="category-count">${categoryTabs.length}</span>
      </div>
      <div class="category-content">
        <ul class="tab-list"></ul>
      </div>
    `;
    
    const list = categoryDiv.querySelector('.tab-list');
    categoryTabs.forEach(tab => {
      const li = createPinnedTabElement(tab);
      list.appendChild(li);
    });
    
    // Add toggle functionality
    const header = categoryDiv.querySelector('.category-header');
    header.addEventListener('click', () => {
      categoryDiv.classList.toggle('collapsed');
    });
    
    container.appendChild(categoryDiv);
  });
}

/**
 * Create a pinned tab element.
 * @param {Object} tab - Tab data
 * @returns {HTMLElement} Tab element
 */
function createPinnedTabElement(tab) {
  const li = document.createElement('li');
  li.className = 'tab-item pinned-item';
  
  li.innerHTML = `
    <div class="tab-favicon">
      ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="">` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`}
    </div>
    <div class="tab-info">
      <div class="tab-title">${escapeHtml(tab.title)}</div>
      <div class="tab-url">${escapeHtml(tab.url)}</div>
    </div>
    <div class="tab-actions">
      <button class="icon-btn open-btn" title="Open">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>
      <button class="icon-btn unpin-btn" title="Unpin">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </button>
    </div>
  `;

  li.querySelector('.open-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openPinnedTab(tab.id);
  });

  li.querySelector('.unpin-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    unpinTab(tab.id);
  });

  li.addEventListener('click', () => openPinnedTab(tab.id));

  return li;
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
 * Toggle search box visibility.
 * @returns {void}
 */
function toggleSearch() {
  const searchBox = document.getElementById('searchBox');
  const searchToggle = document.getElementById('searchToggle');
  const searchInput = document.getElementById('searchInput');
  
  searchBox.classList.toggle('collapsed');
  searchToggle.classList.toggle('active');
  
  if (!searchBox.classList.contains('collapsed')) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    renderTabList(savedTabs);
  }
}

/**
 * Switch between Saved and Pinned tabs.
 * @param {string} tabName - 'saved' or 'pinned'
 * @returns {void}
 */
function switchTab(tabName) {
  // Update nav buttons
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update panels
  document.getElementById('savedPanel').classList.toggle('active', tabName === 'saved');
  document.getElementById('pinnedPanel').classList.toggle('active', tabName === 'pinned');
  
  // Update tab count based on active panel
  const count = tabName === 'saved' ? savedTabs.length : pinnedTabs.length;
  document.getElementById('tabCount').textContent = `${count} tab${count !== 1 ? 's' : ''}`;
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
 * Load pinned tabs from storage.
 * @returns {Promise<void>}
 */
async function loadPinnedTabs() {
  try {
    const result = await chrome.storage.local.get(PINNED_STORAGE_KEY);
    pinnedTabs = result[PINNED_STORAGE_KEY] || [];
  } catch (error) {
    console.error('Error loading pinned tabs:', error);
    pinnedTabs = [];
  }
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
  document.getElementById('categories').style.display = hasTabs ? 'block' : 'none';

  renderTabList(savedTabs);
  renderPinnedTabs();
}

/**
 * Detect if tab is a form/application and extract metadata.
 * @param {Object} tab - Tab data
 * @returns {Object} { isForm, formType, deadline }
 */
function detectForm(tab) {
  const title = tab.title.toLowerCase();
  const url = tab.url.toLowerCase();
  const text = `${title} ${url}`;
  
  // Check for form patterns
  for (const [type, patterns] of Object.entries(FORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        // Try to extract deadline from title
        const deadline = extractDeadline(title);
        return { isForm: true, formType: type, deadline };
      }
    }
  }
  
  // Check for generic form indicators
  if (text.includes('form') || text.includes('application') || 
      text.includes('submit') || text.includes('register') ||
      text.includes('signup') || text.includes('enroll')) {
    const deadline = extractDeadline(title);
    return { isForm: true, formType: 'general', deadline };
  }
  
  return { isForm: false, formType: null, deadline: null };
}

/**
 * Extract deadline from text.
 * @param {string} text - Text to search
 * @returns {string|null} Extracted deadline or null
 */
function extractDeadline(text) {
  // Common deadline patterns
  const patterns = [
    /deadline[:\s]+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /due[:\s]+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /by[:\s]+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /closes[:\s]+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /ends[:\s]+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /expires[:\s]+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /deadline[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /due[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /by[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /closes[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /ends[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /expires[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
    /\b(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/g
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
}

/** @type {Object} Domain-based category mapping */
const DOMAIN_CATEGORIES = {
  // AI
  'claude.ai': 'AI',
  'anthropic.com': 'AI',
  'openai.com': 'AI',
  'chatgpt.com': 'AI',
  'chat.openai.com': 'AI',
  'cursor.com': 'AI',
  'cursor.sh': 'AI',
  'x.ai': 'AI',
  'grok.com': 'AI',
  'perplexity.ai': 'AI',
  'midjourney.com': 'AI',
  'stability.ai': 'AI',
  'runwayml.com': 'AI',
  'replicate.com': 'AI',
  'together.ai': 'AI',
  'huggingface.co': 'AI',
  'kaggle.com': 'AI',
  'colab.research.google.com': 'AI',
  'deepmind.com': 'AI',
  'character.ai': 'AI',
  'poe.com': 'AI',
  'you.com': 'AI',
  'phind.com': 'AI',
  'writesonic.com': 'AI',
  'jasper.ai': 'AI',
  'copy.ai': 'AI',
  'gamma.app': 'AI',
  'notion.so': 'AI',
  'replit.com': 'AI',
  'v0.dev': 'AI',
  'bolt.new': 'AI',
  'windsurf.ai': 'AI',
  'aider.chat': 'AI',
  'zed.dev': 'AI',
  'supermaven.com': 'AI',
  'tabnine.com': 'AI',
  'copilot.github.com': 'AI',
  'github.com/features/copilot': 'AI',
  
  // Tech
  'github.com': 'TECH',
  'stackoverflow.com': 'TECH',
  'stackexchange.com': 'TECH',
  'dev.to': 'TECH',
  'medium.com': 'TECH',
  'hashnode.com': 'TECH',
  'producthunt.com': 'TECH',
  'hackernews.com': 'TECH',
  'news.ycombinator.com': 'TECH',
  'vercel.com': 'TECH',
  'netlify.com': 'TECH',
  'render.com': 'TECH',
  'railway.app': 'TECH',
  'supabase.com': 'TECH',
  'firebase.com': 'TECH',
  'openai.com': 'TECH',
  'anthropic.com': 'TECH',
  'huggingface.co': 'TECH',
  'kaggle.com': 'TECH',
  'colab.research.google.com': 'TECH',
  
  // Social
  'twitter.com': 'SOCIAL',
  'x.com': 'SOCIAL',
  'facebook.com': 'SOCIAL',
  'instagram.com': 'SOCIAL',
  'linkedin.com': 'SOCIAL',
  'threads.net': 'SOCIAL',
  'bsky.app': 'SOCIAL',
  'mastodon.social': 'SOCIAL',
  
  // Entertainment
  'youtube.com': 'ENTERTAINMENT',
  'youtu.be': 'ENTERTAINMENT',
  'netflix.com': 'ENTERTAINMENT',
  'twitch.tv': 'ENTERTAINMENT',
  'reddit.com': 'ENTERTAINMENT',
  'spotify.com': 'ENTERTAINMENT',
  'soundcloud.com': 'ENTERTAINMENT',
  'vimeo.com': 'ENTERTAINMENT',
  'disneyplus.com': 'ENTERTAINMENT',
  'hulu.com': 'ENTERTAINMENT',
  'hbomax.com': 'ENTERTAINMENT',
  'primevideo.com': 'ENTERTAINMENT',
  
  // Shopping
  'amazon.com': 'SHOPPING',
  'amazon.': 'SHOPPING',
  'ebay.com': 'SHOPPING',
  'etsy.com': 'SHOPPING',
  'shopify.com': 'SHOPPING',
  'aliexpress.com': 'SHOPPING',
  'target.com': 'SHOPPING',
  'walmart.com': 'SHOPPING',
  'bestbuy.com': 'SHOPPING',
  'instacart.com': 'SHOPPING',
  
  // News
  'news.google.com': 'NEWS',
  'bbc.com': 'NEWS',
  'cnn.com': 'NEWS',
  'nytimes.com': 'NEWS',
  'washingtonpost.com': 'NEWS',
  'theguardian.com': 'NEWS',
  'reuters.com': 'NEWS',
  'bloomberg.com': 'NEWS',
  'wsj.com': 'NEWS',
  'techcrunch.com': 'NEWS',
  'theverge.com': 'NEWS',
  'wired.com': 'NEWS',
  
  // Work
  'slack.com': 'WORK',
  'notion.so': 'WORK',
  'linear.app': 'WORK',
  'asana.com': 'WORK',
  'trello.com': 'WORK',
  'monday.com': 'WORK',
  'clickup.com': 'WORK',
  'airtable.com': 'WORK',
  'figma.com': 'WORK',
  'canva.com': 'WORK',
  'miro.com': 'WORK',
  'zoom.us': 'WORK',
  'meet.google.com': 'WORK',
  'teams.microsoft.com': 'WORK',
  'calendar.google.com': 'WORK',
  'outlook.com': 'WORK',
  'gmail.com': 'WORK',
  'drive.google.com': 'WORK',
  'docs.google.com': 'WORK',
  'sheets.google.com': 'WORK',
  'slides.google.com': 'WORK',
  'dropbox.com': 'WORK',
  
  // Education
  'coursera.org': 'EDUCATION',
  'udemy.com': 'EDUCATION',
  'edx.org': 'EDUCATION',
  'khanacademy.org': 'EDUCATION',
  'skillshare.com': 'EDUCATION',
  'duolingo.com': 'EDUCATION',
  'brilliant.org': 'EDUCATION',
  'codecademy.com': 'EDUCATION',
  'freecodecamp.org': 'EDUCATION',
  'pluralsight.com': 'EDUCATION',
  
  // Reference
  'wikipedia.org': 'REFERENCE',
  'wiktionary.org': 'REFERENCE',
  'dictionary.com': 'REFERENCE',
  'merriam-webster.com': 'REFERENCE',
  'docs.': 'REFERENCE',
  'documentation': 'REFERENCE'
};

/**
 * Extract domain from URL.
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain or empty string
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Categorize tabs using domain and content analysis.
 * @param {Array<Object>} tabs - Tabs to categorize
 * @returns {Promise<Array<Object>>} Tabs with categories
 */
async function categorizeTabs(tabs) {
  return tabs.map(tab => {
    // First check if it's a form/application
    const formInfo = detectForm(tab);
    if (formInfo.isForm) {
      return { 
        ...tab, 
        category: 'APPLICATIONS',
        formType: formInfo.formType,
        deadline: formInfo.deadline
      };
    }
    
    // Check domain-based categorization
    const domain = extractDomain(tab.url);
    for (const [pattern, category] of Object.entries(DOMAIN_CATEGORIES)) {
      if (domain === pattern || domain.endsWith(pattern) || domain.includes(pattern)) {
        return { ...tab, category };
      }
    }
    
    // Fallback to title/URL-based categorization
    const title = tab.title.toLowerCase();
    const url = tab.url.toLowerCase();
    const text = `${title} ${url}`;
    
    // AI keywords
    if (text.includes('claude') || text.includes('gpt') || text.includes('chatgpt') ||
        text.includes('openai') || text.includes('anthropic') || text.includes('x.ai') ||
        text.includes('xai') || text.includes('grok') || text.includes('perplexity') ||
        text.includes('midjourney') || text.includes('stable diffusion') || text.includes('runway') ||
        text.includes('huggingface') || text.includes('llm') || text.includes('large language model') ||
        text.includes('prompt') || text.includes('prompts') || text.includes('agent') ||
        text.includes('agents') || text.includes('agentic') || text.includes('autonomous') ||
        text.includes('cursor') || text.includes('windsurf') || text.includes('copilot') ||
        text.includes('tabnine') || text.includes('aider') || text.includes('replit') ||
        text.includes('bolt.new') || text.includes('v0.dev') || text.includes('zed') ||
        text.includes('artificial intelligence') || text.includes('machine learning') ||
        text.includes('deep learning') || text.includes('neural network') || text.includes('transformer') ||
        text.includes('generative ai') || text.includes('genai') || text.includes('gen ai') ||
        text.includes('ai model') || text.includes('ai tool') || text.includes('ai assistant') ||
        text.includes('chatbot') || text.includes('conversation ai') || text.includes('nlp') ||
        text.includes('natural language') || text.includes('computer vision') || text.includes('image generation') ||
        text.includes('text generation') || text.includes('code generation') || text.includes('skill.md') ||
        text.includes('glm') || text.includes('zhipu') || text.includes('qwen') || text.includes('llama') ||
        text.includes('mistral') || text.includes('gemini') || text.includes('bard') ||
        text.includes('deepseek') || text.includes('yi') || text.includes('moonshot') ||
        text.includes('kimi') || text.includes('doubao') || text.includes('ernie') ||
        text.includes('palm') || text.includes('falcon') || text.includes('vicuna') ||
        text.includes('alpaca') || text.includes('stablelm') || text.includes('dolly')) {
      return { ...tab, category: 'AI' };
    }
    
    // Tech keywords
    if (text.includes('github') || text.includes('stackoverflow') ||
        text.includes('code') || text.includes('dev') ||
        text.includes('terminal') || text.includes('console') ||
        text.includes('product') || text.includes('pricing') || text.includes('features') ||
        text.includes('platform') || text.includes('software') || text.includes('app') ||
        text.includes('api') || text.includes('sdk') ||
        text.includes('saas') || text.includes('startup') ||
        text.includes('tech') || text.includes('cloud') ||
        text.includes('data') || text.includes('ai') ||
        text.includes('artificial intelligence') || text.includes('machine learning') ||
        text.includes('llm') || text.includes('framework') || text.includes('library') ||
        text.includes('developer') || text.includes('documentation') ||
        text.includes('git') || text.includes('programming') ||
        text.includes('javascript') || text.includes('python') ||
        text.includes('react') || text.includes('node') ||
        text.includes('typescript') || text.includes('rust') ||
        text.includes('golang') || text.includes('open source')) {
      return { ...tab, category: 'TECH' };
    }
    
    // Social keywords
    if (text.includes('facebook') || text.includes('twitter') ||
        text.includes('instagram') || text.includes('linkedin') ||
        text.includes('social') || text.includes('profile')) {
      return { ...tab, category: 'SOCIAL' };
    }
    
    // Entertainment keywords
    if (text.includes('youtube') || text.includes('netflix') ||
        text.includes('twitch') || text.includes('reddit') ||
        text.includes('spotify') || text.includes('music') ||
        text.includes('video') || text.includes('movie') ||
        text.includes('game') || text.includes('play') ||
        text.includes('entertainment')) {
      return { ...tab, category: 'ENTERTAINMENT' };
    }
    
    // Shopping keywords
    if (text.includes('amazon') || text.includes('shop') ||
        text.includes('buy') || text.includes('cart') ||
        text.includes('checkout') || text.includes('order') ||
        text.includes('price') || text.includes('store') ||
        text.includes('product') && text.includes('buy')) {
      return { ...tab, category: 'SHOPPING' };
    }
    
    // News keywords
    if (text.includes('news') || text.includes('bbc') ||
        text.includes('cnn') || text.includes('times') ||
        text.includes('breaking') || text.includes('headline') ||
        text.includes('latest') || text.includes('/news/')) {
      return { ...tab, category: 'NEWS' };
    }
    
    // Work keywords
    if (text.includes('work') || text.includes('office') ||
        text.includes('slack') || text.includes('teams') ||
        text.includes('meeting') || text.includes('calendar') ||
        text.includes('email') || text.includes('inbox') ||
        text.includes('document') || text.includes('spreadsheet') ||
        text.includes('presentation') || text.includes('project')) {
      return { ...tab, category: 'WORK' };
    }
    
    // Education keywords
    if (text.includes('learn') || text.includes('course') ||
        text.includes('tutorial') || text.includes('edu') ||
        text.includes('training') || text.includes('class') ||
        text.includes('lesson') || text.includes('education')) {
      return { ...tab, category: 'EDUCATION' };
    }
    
    // Reference keywords
    if (text.includes('wiki') || text.includes('docs') ||
        text.includes('documentation') || text.includes('reference') ||
        text.includes('dictionary') || text.includes('encyclopedia')) {
      return { ...tab, category: 'REFERENCE' };
    }
    
    return { ...tab, category: 'UNCATEGORIZED' };
  });
}

/**
 * Group tabs by category.
 * @param {Array<Object>} tabs - Tabs to group
 * @returns {Object} Tabs grouped by category
 */
function groupTabsByCategory(tabs) {
  const grouped = {};
  
  // Initialize all categories
  Object.keys(CATEGORIES).forEach(category => {
    grouped[category] = [];
  });
  
  // Group tabs
  tabs.forEach(tab => {
    const category = tab.category || 'UNCATEGORIZED';
    grouped[category].push(tab);
  });
  
  return grouped;
}

/**
 * Get sorted category keys by priority.
 * @returns {Array<string>} Sorted category keys
 */
function getSortedCategories() {
  return Object.entries(CATEGORIES)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([key]) => key);
}

/**
 * Render categorized tabs.
 * @param {Array<Object>} tabs - Tabs to render
 * @returns {void}
 */
async function renderCategorizedTabs(tabs) {
  const container = document.getElementById('categories');
  container.innerHTML = '';
  
  // Categorize tabs
  const categorizedTabs = await categorizeTabs(tabs);
  const grouped = groupTabsByCategory(categorizedTabs);
  const sortedCategories = getSortedCategories();
  
  // Render each category in priority order
  sortedCategories.forEach(categoryKey => {
    const categoryTabs = grouped[categoryKey];
    if (categoryTabs.length === 0) return;
    
    const category = CATEGORIES[categoryKey];
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';
    categoryDiv.innerHTML = `
      <div class="category-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="category-toggle">▼</span>
          <span class="category-name">${category.name}</span>
        </div>
        <span class="category-count">${categoryTabs.length}</span>
      </div>
      <div class="category-content">
        <ul class="tab-list"></ul>
      </div>
    `;
    
    const list = categoryDiv.querySelector('.tab-list');
    categoryTabs.forEach(tab => {
      const li = createTabElement(tab);
      list.appendChild(li);
    });
    
    // Add toggle functionality
    const header = categoryDiv.querySelector('.category-header');
    header.addEventListener('click', () => {
      categoryDiv.classList.toggle('collapsed');
    });
    
    container.appendChild(categoryDiv);
  });
}

/**
 * Create a tab element.
 * @param {Object} tab - Tab data
 * @returns {HTMLElement} Tab element
 */
function createTabElement(tab) {
  const li = document.createElement('li');
  li.className = `tab-item${tab.category === 'APPLICATIONS' ? ' is-form' : ''}`;
  
  // Build metadata HTML for forms
  let metaHtml = '';
  if (tab.category === 'APPLICATIONS' && tab.formType) {
    const formLabel = tab.formType.charAt(0).toUpperCase() + tab.formType.slice(1);
    metaHtml = `
      <div class="tab-meta">
        <span class="form-label">${formLabel}</span>
        ${tab.deadline ? `<span class="deadline">Due: ${tab.deadline}</span>` : ''}
      </div>
    `;
  }
  
  li.innerHTML = `
    <div class="tab-favicon">
      ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="">` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`}
    </div>
    <div class="tab-info">
      <div class="tab-title">${escapeHtml(tab.title)}</div>
      ${metaHtml}
      <div class="tab-url">${escapeHtml(tab.url)}</div>
    </div>
    <div class="tab-actions">
      <button class="icon-btn pin-btn" title="Pin for reference">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </button>
      <button class="icon-btn restore-btn" title="Open tab">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>
      <button class="icon-btn delete-btn" title="Remove">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  li.querySelector('.pin-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    pinTab(tab.id);
  });

  li.querySelector('.restore-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    restoreSingleTab(tab.id);
  });

  li.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSingleTab(tab.id);
  });

  li.addEventListener('click', () => restoreSingleTab(tab.id));

  return li;
}

/**
 * Render the tab list (legacy function for search).
 * @param {Array<Object>} tabs - Tabs to render
 * @returns {void}
 */
function renderTabList(tabs) {
  renderCategorizedTabs(tabs);
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

/** @type {string} Google Form URL for feedback */
const GOOGLE_FORM_URL = 'https://forms.gle/YW9ZRA4pEiU8mdCv8';

/**
 * Handle feedback button click.
 * @returns {void}
 */
function handleFeedback() {
  try {
    // Open Google Form in new tab
    chrome.tabs.create({
      url: GOOGLE_FORM_URL,
      active: true
    });
    
    showNotification('Opening feedback form...');
  } catch (error) {
    console.error('Feedback error:', error);
    // Fallback to email if form fails
    const email = 'shannicrankcafe@gmail.com';
    navigator.clipboard.writeText(email).then(() => {
      showNotification('Form unavailable. Email copied: ' + email);
    }).catch(() => {
      showNotification('Feedback email: shannicrankcafe@gmail.com');
    });
  }
}

/**
 * Show a temporary notification.
 * @param {string} message - Message to display
 * @returns {void}
 */
function showNotification(message) {
  // Remove existing notification if any
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}
