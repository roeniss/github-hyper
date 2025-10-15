// Constants
const STATUS_MESSAGE_DURATION = 2000; // milliseconds

// Default settings
const defaultSettings = {
  enableAbsoluteTime: true,
  customDomains: []
};

// Load saved settings when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

/**
 * Loads settings from Chrome sync storage and updates the UI.
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(defaultSettings);

    // Update checkbox states
    document.getElementById('enableAbsoluteTime').checked = result.enableAbsoluteTime;

    // Load custom domains
    renderDomainList(result.customDomains || []);
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

/**
 * Saves settings to Chrome sync storage.
 * Merges partial settings with existing settings to prevent race conditions.
 */
async function saveSettings(partialSettings) {
  try {
    const currentSettings = await chrome.storage.sync.get(defaultSettings);
    const newSettings = { ...currentSettings, ...partialSettings };
    await chrome.storage.sync.set(newSettings);
    showStatus('Settings saved!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

/**
 * Gets current settings from Chrome storage.
 */
async function getSettings() {
  try {
    return await chrome.storage.sync.get(defaultSettings);
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
}

/**
 * Renders the list of custom domains.
 */
function renderDomainList(domains) {
  const list = document.getElementById('customDomainsList');
  list.innerHTML = '';

  if (domains.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.textContent = 'No custom domains added yet.';
    emptyMessage.style.color = '#718096';
    emptyMessage.style.fontSize = '14px';
    emptyMessage.style.padding = '12px';
    list.appendChild(emptyMessage);
    return;
  }

  domains.forEach((domain, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'domain-item';
    listItem.setAttribute('role', 'listitem');

    const domainSpan = document.createElement('span');
    domainSpan.className = 'domain-name';
    domainSpan.textContent = domain;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', `Remove domain ${domain}`);
    removeBtn.addEventListener('click', () => removeDomain(index));

    listItem.appendChild(domainSpan);
    listItem.appendChild(removeBtn);
    list.appendChild(listItem);
  });
}

/**
 * Validates a domain string.
 */
function isValidDomain(domain) {
  // More robust domain validation - prevents double dots, leading/trailing dots
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Adds a new custom domain.
 */
async function addDomain() {
  const input = document.getElementById('customDomainInput');
  const domain = input.value.trim().toLowerCase();

  if (!domain) {
    showStatus('Please enter a domain', 'error');
    return;
  }

  if (!isValidDomain(domain)) {
    showStatus('Invalid domain format', 'error');
    return;
  }

  try {
    const settings = await getSettings();
    const domains = settings.customDomains || [];

    if (domains.includes(domain)) {
      showStatus('Domain already exists', 'error');
      return;
    }

    domains.push(domain);
    await saveSettings({ customDomains: domains });
    renderDomainList(domains);
    input.value = '';

    // Request host permissions for the new domain
    if (chrome.permissions) {
      const newPermissions = {
        origins: [`https://${domain}/*`]
      };

      try {
        await chrome.permissions.request(newPermissions);
      } catch (permError) {
        console.warn('Could not request permissions for domain:', permError);
        // Don't fail the whole operation if permissions can't be requested
      }
    }
  } catch (error) {
    console.error('Error adding domain:', error);
    showStatus('Failed to add domain', 'error');
  }
}

/**
 * Removes a custom domain by index.
 */
async function removeDomain(index) {
  try {
    const settings = await getSettings();
    const domains = settings.customDomains || [];

    domains.splice(index, 1);

    await saveSettings({ customDomains: domains });
    renderDomainList(domains);
  } catch (error) {
    console.error('Error removing domain:', error);
    showStatus('Failed to remove domain', 'error');
  }
}

/**
 * Sets up event listeners.
 */
function setupEventListeners() {
  // Feature toggle
  const absoluteTimeToggle = document.getElementById('enableAbsoluteTime');
  absoluteTimeToggle.addEventListener('change', async () => {
    try {
      await saveSettings({ enableAbsoluteTime: absoluteTimeToggle.checked });
    } catch (error) {
      console.error('Error saving toggle:', error);
      showStatus('Failed to save settings', 'error');
    }
  });

  // Domain management
  const addDomainBtn = document.getElementById('addDomainBtn');
  addDomainBtn.addEventListener('click', addDomain);

  const domainInput = document.getElementById('customDomainInput');
  domainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addDomain();
    }
  });
}

/**
 * Displays a temporary status message.
 */
let statusTimeout;
function showStatus(message, type = 'success') {
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }

  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.className = `status-message ${type} show`;

  statusTimeout = setTimeout(() => {
    statusElement.className = 'status-message';
  }, STATUS_MESSAGE_DURATION);
}

// Make getSettings available globally
window.getSettings = getSettings;
