import { jest } from '@jest/globals';
import {
  extractProjectName,
  extractFileInfo,
  extractLineNumber,
  constructIDEUrl,
  createDeepLinkButton,
  findReviewCommentBlocks,
  injectButtons,
  initObserver,
  init
} from './ide-deep-link.js';

describe('extractProjectName', () => {
  beforeEach(() => {
    delete global.window;
    global.window = { location: { pathname: '' } };
  });

  it('should extract project name from PR URL', () => {
    window.location.pathname = '/owner/my-project/pull/123';
    expect(extractProjectName()).toBe('my-project');
  });

  it('should extract project name from blob URL', () => {
    window.location.pathname = '/owner/another-repo/blob/main/src/file.ts';
    expect(extractProjectName()).toBe('another-repo');
  });

  it('should extract project name from files URL', () => {
    window.location.pathname = '/owner/test-repo/files/abc123';
    expect(extractProjectName()).toBe('test-repo');
  });

  it('should handle project names with hyphens and numbers', () => {
    window.location.pathname = '/org/my-project-123/pull/456';
    expect(extractProjectName()).toBe('my-project-123');
  });

  it('should return empty string for invalid URL', () => {
    window.location.pathname = '/';
    expect(extractProjectName()).toBe('');
  });

  it('should return empty string for URL without repo', () => {
    window.location.pathname = '/owner';
    expect(extractProjectName()).toBe('');
  });
});

describe('extractFileInfo', () => {
  it('should extract file path from anchor element', () => {
    const anchor = document.createElement('a');
    anchor.textContent = 'src/components/Button.tsx';
    expect(extractFileInfo(anchor)).toBe('src/components/Button.tsx');
  });

  it('should trim whitespace from file path', () => {
    const anchor = document.createElement('a');
    anchor.textContent = '  src/utils/helper.js  ';
    expect(extractFileInfo(anchor)).toBe('src/utils/helper.js');
  });

  it('should return empty string for non-anchor element', () => {
    const div = document.createElement('div');
    expect(extractFileInfo(div)).toBe('');
  });

  it('should return empty string for null element', () => {
    expect(extractFileInfo(null)).toBe('');
  });

  it('should return empty string for undefined element', () => {
    expect(extractFileInfo(undefined)).toBe('');
  });

  it('should handle file paths with spaces', () => {
    const anchor = document.createElement('a');
    anchor.textContent = 'my folder/my file.js';
    expect(extractFileInfo(anchor)).toBe('my folder/my file.js');
  });
});

describe('extractLineNumber', () => {
  it('should extract and convert line number from 1-based to 0-based', () => {
    const details = document.createElement('div');
    const td = document.createElement('td');
    td.setAttribute('data-line-number', '42');
    details.appendChild(td);

    expect(extractLineNumber(details)).toBe(41);
  });

  it('should return 0 for line number 1', () => {
    const details = document.createElement('div');
    const td = document.createElement('td');
    td.setAttribute('data-line-number', '1');
    details.appendChild(td);

    expect(extractLineNumber(details)).toBe(0);
  });

  it('should return 0 when no td with data-line-number exists', () => {
    const details = document.createElement('div');
    expect(extractLineNumber(details)).toBe(0);
  });

  it('should return 0 for null element', () => {
    expect(extractLineNumber(null)).toBe(0);
  });

  it('should return 0 for invalid line number', () => {
    const details = document.createElement('div');
    const td = document.createElement('td');
    td.setAttribute('data-line-number', 'invalid');
    details.appendChild(td);

    expect(extractLineNumber(details)).toBe(0);
  });

  it('should use first td if multiple exist', () => {
    const details = document.createElement('div');
    const td1 = document.createElement('td');
    td1.setAttribute('data-line-number', '10');
    const td2 = document.createElement('td');
    td2.setAttribute('data-line-number', '20');
    details.appendChild(td1);
    details.appendChild(td2);

    expect(extractLineNumber(details)).toBe(9);
  });

  it('should handle negative line numbers', () => {
    const details = document.createElement('div');
    const td = document.createElement('td');
    td.setAttribute('data-line-number', '-5');
    details.appendChild(td);

    expect(extractLineNumber(details)).toBe(0);
  });

  it('should handle zero line number', () => {
    const details = document.createElement('div');
    const td = document.createElement('td');
    td.setAttribute('data-line-number', '0');
    details.appendChild(td);

    expect(extractLineNumber(details)).toBe(0);
  });
});

describe('constructIDEUrl', () => {
  it('should construct correct URL for IntelliJ IDEA', () => {
    const url = constructIDEUrl('src/Main.java', 10, 0, 'idea', 'my-project');
    expect(url).toBe('jetbrains://idea/navigate/reference?project=my-project&path=src%2FMain.java:10:0');
  });

  it('should construct correct URL for WebStorm', () => {
    const url = constructIDEUrl('src/App.tsx', 5, 0, 'web-storm', 'web-app');
    expect(url).toBe('jetbrains://web-storm/navigate/reference?project=web-app&path=src%2FApp.tsx:5:0');
  });

  it('should construct correct URL for PyCharm', () => {
    const url = constructIDEUrl('main.py', 20, 0, 'pycharm', 'python-project');
    expect(url).toBe('jetbrains://pycharm/navigate/reference?project=python-project&path=main.py:20:0');
  });

  it('should default to idea when ideType not provided', () => {
    const url = constructIDEUrl('test.js', 0, 0, null, 'project');
    expect(url).toBe('jetbrains://idea/navigate/reference?project=project&path=test.js:0:0');
  });

  it('should encode special characters in file path', () => {
    const url = constructIDEUrl('my folder/my file.ts', 0, 0, 'idea', 'project');
    expect(url).toContain('my%20folder%2Fmy%20file.ts');
  });

  it('should encode special characters in project name', () => {
    const url = constructIDEUrl('file.ts', 0, 0, 'idea', 'my-project with spaces');
    expect(url).toContain('project=my-project%20with%20spaces');
  });

  it('should return empty string when filePath is empty', () => {
    const url = constructIDEUrl('', 0, 0, 'idea', 'project');
    expect(url).toBe('');
  });

  it('should return empty string when projectName is empty', () => {
    const url = constructIDEUrl('file.ts', 0, 0, 'idea', '');
    expect(url).toBe('');
  });

  it('should handle line 0 column 0', () => {
    const url = constructIDEUrl('file.ts', 0, 0, 'idea', 'project');
    expect(url).toBe('jetbrains://idea/navigate/reference?project=project&path=file.ts:0:0');
  });

  it('should handle different column values', () => {
    const url = constructIDEUrl('file.ts', 10, 5, 'idea', 'project');
    expect(url).toBe('jetbrains://idea/navigate/reference?project=project&path=file.ts:10:5');
  });
});

describe('createDeepLinkButton', () => {
  it('should create button with correct text', () => {
    const button = createDeepLinkButton('jetbrains://idea/navigate/reference?project=test&path=file.ts:0:0', 'idea');
    expect(button.textContent).toBe('🚀');
  });

  it('should create button with correct title', () => {
    const button = createDeepLinkButton('some-url', 'web-storm');
    expect(button.title).toBe('Open in WebStorm');
  });

  it('should have correct CSS class', () => {
    const button = createDeepLinkButton('some-url', 'idea');
    expect(button.className).toBe('ide-link-btn');
  });

  it('should have inline styles', () => {
    const button = createDeepLinkButton('some-url', 'idea');
    expect(button.style.marginLeft).toBe('8px');
    expect(button.style.cursor).toBe('pointer');
  });

  it('should navigate to URL on click', () => {
    const testUrl = 'jetbrains://idea/navigate/reference?project=test&path=file.ts:0:0';
    const button = createDeepLinkButton(testUrl, 'idea');

    delete global.window;
    global.window = { location: { href: '' } };

    button.click();

    expect(window.location.href).toBe(testUrl);
  });

  it('should handle different IDE types in title', () => {
    const button = createDeepLinkButton('url', 'pycharm');
    expect(button.title).toBe('Open in PyCharm');
  });

  it('should default to "IDE" for unknown IDE type', () => {
    const button = createDeepLinkButton('url', 'unknown-ide');
    expect(button.title).toBe('Open in IDE');
  });

  it('should change background on mouseenter', () => {
    const button = createDeepLinkButton('url', 'idea');
    expect(button.style.background).toBe('rgb(246, 248, 250)');

    // Trigger mouseenter
    const mouseEnterEvent = new Event('mouseenter');
    button.dispatchEvent(mouseEnterEvent);

    expect(button.style.background).toBe('rgb(225, 228, 232)');
  });

  it('should change background on mouseleave', () => {
    const button = createDeepLinkButton('url', 'idea');

    // First trigger mouseenter to change background
    const mouseEnterEvent = new Event('mouseenter');
    button.dispatchEvent(mouseEnterEvent);
    expect(button.style.background).toBe('rgb(225, 228, 232)');

    // Then trigger mouseleave
    const mouseLeaveEvent = new Event('mouseleave');
    button.dispatchEvent(mouseLeaveEvent);

    expect(button.style.background).toBe('rgb(246, 248, 250)');
  });
});

describe('findReviewCommentBlocks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should find details-collapsible with file links', () => {
    const details = document.createElement('details-collapsible');
    const summary = document.createElement('summary');
    const anchor = document.createElement('a');
    anchor.className = 'text-mono';
    anchor.href = '/owner/repo/pull/123/files/abc';
    anchor.textContent = 'src/file.tsx';
    summary.appendChild(anchor);
    details.appendChild(summary);
    document.body.appendChild(details);

    const blocks = findReviewCommentBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].anchor).toBe(anchor);
    expect(blocks[0].details).toBe(details);
  });

  it('should skip details without summary', () => {
    const details = document.createElement('details-collapsible');
    document.body.appendChild(details);

    const blocks = findReviewCommentBlocks();
    expect(blocks).toHaveLength(0);
  });

  it('should skip already processed anchors', () => {
    const details = document.createElement('details-collapsible');
    const summary = document.createElement('summary');
    const anchor = document.createElement('a');
    anchor.className = 'text-mono';
    anchor.href = '/owner/repo/pull/123/files/abc';
    anchor.setAttribute('data-ide-link-processed', 'true');
    summary.appendChild(anchor);
    details.appendChild(summary);
    document.body.appendChild(details);

    const blocks = findReviewCommentBlocks();
    expect(blocks).toHaveLength(0);
  });

  it('should only include links with /files/ or /blob/ in href', () => {
    const details1 = document.createElement('details-collapsible');
    const summary1 = document.createElement('summary');
    const anchor1 = document.createElement('a');
    anchor1.className = 'text-mono';
    anchor1.href = '/owner/repo/pull/123/files/abc';
    summary1.appendChild(anchor1);
    details1.appendChild(summary1);

    const details2 = document.createElement('details-collapsible');
    const summary2 = document.createElement('summary');
    const anchor2 = document.createElement('a');
    anchor2.className = 'text-mono';
    anchor2.href = '/owner/repo/issues/123';
    summary2.appendChild(anchor2);
    details2.appendChild(summary2);

    document.body.appendChild(details1);
    document.body.appendChild(details2);

    const blocks = findReviewCommentBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].anchor).toBe(anchor1);
  });

  it('should handle multiple valid blocks', () => {
    for (let i = 0; i < 3; i++) {
      const details = document.createElement('details-collapsible');
      const summary = document.createElement('summary');
      const anchor = document.createElement('a');
      anchor.className = 'text-mono';
      anchor.href = `/owner/repo/blob/main/file${i}.ts`;
      summary.appendChild(anchor);
      details.appendChild(summary);
      document.body.appendChild(details);
    }

    const blocks = findReviewCommentBlocks();
    expect(blocks).toHaveLength(3);
  });
});

describe('injectButtons', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.console.warn = jest.fn();
  });

  it('should inject button next to anchor', () => {
    const details = document.createElement('details-collapsible');
    const summary = document.createElement('summary');
    const anchor = document.createElement('a');
    anchor.className = 'text-mono';
    anchor.href = '/owner/repo/pull/123/files/abc';
    anchor.textContent = 'src/file.tsx';

    const td = document.createElement('td');
    td.setAttribute('data-line-number', '10');
    details.appendChild(td);

    summary.appendChild(anchor);
    details.appendChild(summary);
    document.body.appendChild(details);

    injectButtons('idea', 'test-project');

    const button = anchor.nextSibling;
    expect(button).toBeTruthy();
    expect(button.className).toBe('ide-link-btn');
    expect(anchor.hasAttribute('data-ide-link-processed')).toBe(true);
  });

  it('should not inject buttons when projectName is empty', () => {
    const details = document.createElement('details-collapsible');
    const summary = document.createElement('summary');
    const anchor = document.createElement('a');
    anchor.className = 'text-mono';
    anchor.href = '/owner/repo/pull/123/files/abc';
    anchor.textContent = 'src/file.tsx';
    summary.appendChild(anchor);
    details.appendChild(summary);
    document.body.appendChild(details);

    injectButtons('idea', '');

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('project name not found'));
    expect(anchor.nextSibling).toBeFalsy();
  });

  it('should skip blocks with empty file path', () => {
    const details = document.createElement('details-collapsible');
    const summary = document.createElement('summary');
    const anchor = document.createElement('a');
    anchor.className = 'text-mono';
    anchor.href = '/owner/repo/pull/123/files/abc';
    anchor.textContent = '';
    summary.appendChild(anchor);
    details.appendChild(summary);
    document.body.appendChild(details);

    injectButtons('idea', 'project');

    expect(anchor.nextSibling).toBeFalsy();
  });

  it('should insert button before nextSibling when it exists', () => {
    const details = document.createElement('details-collapsible');
    const summary = document.createElement('summary');
    const anchor = document.createElement('a');
    anchor.className = 'text-mono';
    anchor.href = '/owner/repo/pull/123/files/abc';
    anchor.textContent = 'src/file.tsx';

    // Add a sibling element after the anchor
    const nextElement = document.createElement('span');
    nextElement.textContent = 'next element';

    summary.appendChild(anchor);
    summary.appendChild(nextElement);
    details.appendChild(summary);

    const td = document.createElement('td');
    td.setAttribute('data-line-number', '10');
    details.appendChild(td);

    document.body.appendChild(details);

    injectButtons('idea', 'test-project');

    // Button should be inserted between anchor and nextElement
    expect(anchor.nextSibling).toBeTruthy();
    expect(anchor.nextSibling.className).toBe('ide-link-btn');
    expect(anchor.nextSibling.nextSibling).toBe(nextElement);
  });
});

describe('initObserver', () => {
  let observerCallback;

  beforeEach(() => {
    global.MutationObserver = jest.fn().mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
    });

    global.Node = {
      ELEMENT_NODE: 1
    };

    document.body.innerHTML = '';
  });

  it('should initialize MutationObserver', () => {
    initObserver('idea', 'project');

    expect(MutationObserver).toHaveBeenCalled();
  });

  it('should process added details-collapsible elements', () => {
    initObserver('idea', 'test-project');

    // Create and add details-collapsible to document
    const detailsElement = document.createElement('details-collapsible');
    const summary = document.createElement('summary');
    const anchor = document.createElement('a');
    anchor.className = 'text-mono';
    anchor.href = '/owner/repo/pull/123/files/abc';
    anchor.textContent = 'file.tsx';
    summary.appendChild(anchor);
    detailsElement.appendChild(summary);

    // Add to document first so querySelectorAll can find it
    document.body.appendChild(detailsElement);

    const mutations = [{
      addedNodes: [detailsElement]
    }];

    observerCallback(mutations);

    // Button should be injected
    expect(anchor.hasAttribute('data-ide-link-processed')).toBe(true);
  });
});

describe('init', () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn()
        }
      }
    };

    delete global.window;
    global.window = { location: { pathname: '/owner/my-project/pull/123' } };

    global.console.log = jest.fn();
    global.console.warn = jest.fn();
    global.console.error = jest.fn();

    global.MutationObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn()
    }));

    global.Node = {
      ELEMENT_NODE: 1
    };

    document.body.innerHTML = '';
  });

  afterEach(() => {
    delete global.chrome;
  });

  it('should initialize when feature is enabled', async () => {
    chrome.storage.sync.get.mockResolvedValue({
      enableIDEDeepLink: true,
      ideType: 'idea'
    });

    await init();

    expect(chrome.storage.sync.get).toHaveBeenCalledWith({
      enableIDEDeepLink: true,
      ideType: 'idea'
    });
    expect(MutationObserver).toHaveBeenCalled();
  });

  it('should not initialize when feature is disabled', async () => {
    chrome.storage.sync.get.mockResolvedValue({
      enableIDEDeepLink: false
    });

    await init();

    expect(console.log).toHaveBeenCalledWith('GitHub Hyper: IDE deep link feature is disabled');
    expect(MutationObserver).not.toHaveBeenCalled();
  });

  it('should not initialize when project name cannot be extracted', async () => {
    window.location.pathname = '/';
    chrome.storage.sync.get.mockResolvedValue({
      enableIDEDeepLink: true,
      ideType: 'idea'
    });

    await init();

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Could not extract project name'));
    expect(MutationObserver).not.toHaveBeenCalled();
  });

  it('should handle errors during initialization', async () => {
    const error = new Error('Storage error');
    chrome.storage.sync.get.mockRejectedValue(error);

    await init();

    expect(console.error).toHaveBeenCalledWith('GitHub Hyper: Error initializing IDE deep link:', error);
  });

  it('should use default settings when not specified', async () => {
    chrome.storage.sync.get.mockResolvedValue({
      enableIDEDeepLink: true,
      ideType: 'web-storm'
    });

    await init();

    expect(MutationObserver).toHaveBeenCalled();
  });
});
