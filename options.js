// Default settings - all features enabled by default
const defaultSettings = {
  feature1: true,
  feature2: true,
  feature3: true
};

// Load saved settings when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

// Load settings from Chrome storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(defaultSettings);

    // Update checkbox states based on saved settings
    document.getElementById('feature1').checked = result.feature1;
    document.getElementById('feature2').checked = result.feature2;
    document.getElementById('feature3').checked = result.feature3;
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Save settings to Chrome storage
async function saveSettings() {
  try {
    const settings = {
      feature1: document.getElementById('feature1').checked,
      feature2: document.getElementById('feature2').checked,
      feature3: document.getElementById('feature3').checked
    };

    await chrome.storage.sync.set(settings);
    showStatus('Settings saved!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Setup event listeners for all checkboxes
function setupEventListeners() {
  const checkboxes = ['feature1', 'feature2', 'feature3'];

  checkboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    checkbox.addEventListener('change', async () => {
      try {
        await saveSettings();
      } catch (error) {
        console.error('Error in change event handler:', error);
        showStatus('Failed to save settings', 'error');
      }
    });
  });
}

// Show status message to user
let statusTimeout;
function showStatus(message, type = 'success') {
  // Clear any existing timeout to prevent race conditions
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }

  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.className = `status-message ${type} show`;

  // Hide the message after 2 seconds
  statusTimeout = setTimeout(() => {
    statusElement.className = 'status-message';
  }, 2000);
}

/**
 * Gets current settings from Chrome storage.
 * This function can be used by content scripts or other extension scripts
 * to retrieve user preferences.
 *
 * @returns {Promise<Object>} Object containing all feature settings
 * @example
 * // In a content script:
 * const settings = await getSettings();
 * if (settings.feature1) {
 *   // Apply feature 1
 * }
 */
async function getSettings() {
  try {
    return await chrome.storage.sync.get(defaultSettings);
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
}

// Make getSettings available globally for other scripts
window.getSettings = getSettings;
