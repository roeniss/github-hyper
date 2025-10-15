// GitHub Hyper - Absolute Time Display
// Converts GitHub's relative time to absolute datetime format
//
// NOTE: This content script is injected based on the "matches" pattern in manifest.json.
// While custom domains can be added in settings and permissions requested,
// the script will only auto-inject on those domains after a browser/extension reload
// or when the user refreshes tabs on those domains.

(function() {
  'use strict';

  const PROCESSED_ATTR = 'data-gh-hyper-processed';

  /**
   * Formats ISO datetime string to localized format with UTC offset: yyyy-MM-dd HH:mm:ss UTC±H
   * @param {string} isoString - ISO 8601 datetime string
   * @returns {string} Formatted datetime string with timezone indicator
   */
  function formatDateTime(isoString) {
    const date = new Date(isoString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Add UTC offset indicator
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const offsetHours = Math.floor(Math.abs(offset) / 60);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC${sign}${offsetHours}`;
  }

  /**
   * Processes a relative-time element to add absolute time display
   * @param {HTMLElement} relativeTimeElement - The <relative-time> element
   */
  function processRelativeTime(relativeTimeElement) {
    // Skip if already processed
    if (relativeTimeElement.hasAttribute(PROCESSED_ATTR)) {
      return;
    }

    // Get the datetime attribute
    const datetime = relativeTimeElement.getAttribute('datetime');
    if (!datetime) {
      return;
    }

    try {
      // Format the datetime
      const formattedTime = formatDateTime(datetime);

      // Create span element for absolute time
      const absoluteTimeSpan = document.createElement('span');
      absoluteTimeSpan.className = 'gh-hyper-absolute-time';
      absoluteTimeSpan.textContent = `${formattedTime}`;
      absoluteTimeSpan.style.display = 'block';
      absoluteTimeSpan.style.fontSize = '10px';
      absoluteTimeSpan.style.color = '#656d76';
      absoluteTimeSpan.style.marginLeft = '2px';

      // Insert the span after the parent element of relative-time
      const parent = relativeTimeElement.parentNode;
      if (parent && parent.parentNode) {
        parent.parentNode.insertBefore(
          absoluteTimeSpan,
          parent.nextSibling
        );
        // Mark as processed only if insertion succeeded
        relativeTimeElement.setAttribute(PROCESSED_ATTR, 'true');
      } else {
        console.warn('GitHub Hyper: Could not find parent for relative-time element');
      }
    } catch (error) {
      console.error('GitHub Hyper: Error processing relative-time element', error);
    }
  }

  /**
   * Processes all relative-time elements on the page
   */
  function processAllRelativeTimes() {
    const relativeTimeElements = document.querySelectorAll('relative-time');
    relativeTimeElements.forEach(processRelativeTime);
  }

  /**
   * Initializes the MutationObserver to watch for dynamically added elements
   */
  function initObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a relative-time element
            if (node.tagName === 'RELATIVE-TIME') {
              processRelativeTime(node);
            }
            // Check if the added node contains relative-time elements
            const relativeTimeElements = node.querySelectorAll('relative-time');
            relativeTimeElements.forEach(processRelativeTime);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Initializes the absolute time feature if enabled in settings
   */
  async function init() {
    try {
      // Check if feature is enabled
      const settings = await chrome.storage.sync.get({ enableAbsoluteTime: true });

      if (!settings.enableAbsoluteTime) {
        console.log('GitHub Hyper: Absolute time feature is disabled');
        return;
      }

      // Feature is enabled, proceed with initialization
      processAllRelativeTimes();
      initObserver();
    } catch (error) {
      console.error('GitHub Hyper: Error initializing:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
