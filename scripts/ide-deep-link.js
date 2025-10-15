// GitHub Hyper - IDE Deep Link Feature
// Adds buttons to open files in JetBrains IDEs directly from GitHub PR review comments
//
// Reference: https://github.com/alanhe421/jetbrains-url-schemes

const PROCESSED_ATTR = 'data-ide-link-processed';

/**
 * Extracts project name from GitHub URL
 * @returns {string} Project name or empty string
 */
export function extractProjectName() {
  const pathname = window.location.pathname;
  // Pattern: /owner/REPO_NAME/pull/123 or /owner/REPO_NAME/blob/branch
  const match = pathname.match(/^\/[^/]+\/([^/]+)/);
  return match ? match[1] : '';
}

/**
 * Extracts file path from anchor element
 * @param {HTMLElement} anchorElement - The <a> element containing file path
 * @returns {string} File path or empty string
 */
export function extractFileInfo(anchorElement) {
  if (!anchorElement || anchorElement.tagName !== 'A') {
    return '';
  }
  return anchorElement.textContent.trim();
}

/**
 * Extracts line number from details-collapsible element
 * Converts from GitHub's 1-based to JetBrains' 0-based indexing
 * @param {HTMLElement} detailsElement - The <details-collapsible> element
 * @returns {number} Line number (0-based) or 0 if not found
 */
export function extractLineNumber(detailsElement) {
  if (!detailsElement) {
    return 0;
  }

  const lineNumberTd = detailsElement.querySelector('td[data-line-number]');
  if (!lineNumberTd) {
    return 0;
  }

  const lineNumber = parseInt(lineNumberTd.getAttribute('data-line-number'), 10);
  // Convert from 1-based (GitHub) to 0-based (JetBrains)
  return isNaN(lineNumber) ? 0 : Math.max(0, lineNumber - 1);
}

/**
 * Constructs JetBrains IDE URL
 * @param {string} filePath - Relative file path
 * @param {number} line - Line number (0-based)
 * @param {number} column - Column number (0-based)
 * @param {string} ideType - IDE type identifier (e.g., 'idea', 'web-storm')
 * @param {string} projectName - Project name
 * @returns {string} JetBrains URL
 */
export function constructIDEUrl(filePath, line, column, ideType, projectName) {
  if (!filePath || !projectName) {
    return '';
  }

  const ide = ideType || 'idea';
  return `jetbrains://${ide}/navigate/reference?project=${encodeURIComponent(projectName)}&path=${encodeURIComponent(filePath)}:${line}:${column}`;
}

/**
 * Creates a deep link button element
 * @param {string} url - JetBrains URL
 * @param {string} ideType - IDE type for tooltip
 * @returns {HTMLElement} Button element
 */
export function createDeepLinkButton(url, ideType) {
  const button = document.createElement('button');
  button.className = 'ide-link-btn';
  button.textContent = '🚀';
  button.title = `Open in ${getIDEName(ideType)}`;
  button.style.cssText = `
    margin-left: 8px;
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    cursor: pointer;
    vertical-align: middle;
    transition: background 0.2s ease;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.background = '#e1e4e8';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = '#f6f8fa';
  });

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = url;
  });

  return button;
}

/**
 * Gets human-readable IDE name
 * @param {string} ideType - IDE type identifier
 * @returns {string} IDE name
 */
function getIDEName(ideType) {
  const names = {
    'idea': 'IntelliJ IDEA',
    'web-storm': 'WebStorm',
    'pycharm': 'PyCharm',
    'php-storm': 'PhpStorm',
    'rider': 'Rider',
    'clion': 'CLion',
    'goland': 'GoLand',
    'rubymine': 'RubyMine'
  };
  return names[ideType] || 'IDE';
}

/**
 * Finds all review comment blocks with file links
 * @returns {Array<{anchor: HTMLElement, details: HTMLElement}>} Array of file link info
 */
export function findReviewCommentBlocks() {
  const blocks = [];
  const detailsElements = document.querySelectorAll('details-collapsible');

  detailsElements.forEach(details => {
    const summary = details.querySelector('summary');
    if (!summary) {
      return;
    }

    const anchor = summary.querySelector('a.text-mono');
    if (!anchor || anchor.hasAttribute(PROCESSED_ATTR)) {
      return;
    }

    // Verify this is a file link (has href with /files/ or /blob/)
    const href = anchor.getAttribute('href');
    if (href && (href.includes('/files/') || href.includes('/blob/'))) {
      blocks.push({ anchor, details });
    }
  });

  return blocks;
}

/**
 * Injects IDE deep link buttons next to file links
 * @param {string} ideType - IDE type from settings
 * @param {string} projectName - Project name
 */
export function injectButtons(ideType, projectName) {
  if (!projectName) {
    console.warn('GitHub Hyper: Cannot inject IDE buttons - project name not found');
    return;
  }

  const blocks = findReviewCommentBlocks();

  blocks.forEach(({ anchor, details }) => {
    const filePath = extractFileInfo(anchor);
    if (!filePath) {
      return;
    }

    const line = extractLineNumber(details);
    const column = 0; // Always use column 0

    const url = constructIDEUrl(filePath, line, column, ideType, projectName);
    if (!url) {
      return;
    }

    const button = createDeepLinkButton(url, ideType);

    // Insert button right after the anchor element
    if (anchor.nextSibling) {
      anchor.parentNode.insertBefore(button, anchor.nextSibling);
    } else {
      anchor.parentNode.appendChild(button);
    }

    // Mark as processed
    anchor.setAttribute(PROCESSED_ATTR, 'true');
  });
}

/**
 * Initializes MutationObserver to watch for dynamically added elements
 * @param {string} ideType - IDE type from settings
 * @param {string} projectName - Project name
 */
export function initObserver(ideType, projectName) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is or contains details-collapsible
          if (node.tagName === 'DETAILS-COLLAPSIBLE' ||
              node.querySelector('details-collapsible')) {
            injectButtons(ideType, projectName);
          }
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
 * Initializes the IDE deep link feature if enabled in settings
 */
export async function init() {
  try {
    // Check if feature is enabled
    const settings = await chrome.storage.sync.get({
      enableIDEDeepLink: true,
      ideType: 'idea'
    });

    if (!settings.enableIDEDeepLink) {
      console.log('GitHub Hyper: IDE deep link feature is disabled');
      return;
    }

    // Extract project name from URL
    const projectName = extractProjectName();
    if (!projectName) {
      console.warn('GitHub Hyper: Could not extract project name from URL');
      return;
    }

    // Feature is enabled, proceed with initialization
    injectButtons(settings.ideType, projectName);
    initObserver(settings.ideType, projectName);
  } catch (error) {
    console.error('GitHub Hyper: Error initializing IDE deep link:', error);
  }
}

// Initialize when DOM is ready (skip in test environment)
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
