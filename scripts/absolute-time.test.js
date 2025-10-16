import { jest } from '@jest/globals';
import {
  formatDateTime,
  processRelativeTime,
  processAllRelativeTimes,
  initObserver,
  init
} from './absolute-time.js';

describe('formatDateTime', () => {
  it('should format ISO datetime string correctly with timezone', () => {
    const isoString = '2024-03-15T10:30:45Z';
    const result = formatDateTime(isoString);
    // Just check format, not exact time since timezone varies
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('should handle single digit months and days', () => {
    const isoString = '2024-01-05T09:08:07Z';
    const result = formatDateTime(isoString);
    expect(result).toMatch(/^2024-01-05 \d{2}:\d{2}:\d{2}$/);
  });

  it('should format with correct pattern', () => {
    const isoString = '2024-03-15T10:30:45Z';
    const result = formatDateTime(isoString);
    const parts = result.split(' ');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Date
    expect(parts[1]).toMatch(/^\d{2}:\d{2}:\d{2}$/); // Time
  });

  it('should handle midnight time', () => {
    const isoString = '2024-03-15T00:00:00Z';
    const result = formatDateTime(isoString);
    expect(result).toMatch(/^2024-03-15 \d{2}:\d{2}:\d{2}$/);
  });

  it('should handle end of day time', () => {
    const isoString = '2024-03-15T23:59:59Z';
    const result = formatDateTime(isoString);
    expect(result).toMatch(/^2024-03-1[56] \d{2}:\d{2}:\d{2}$/);
  });
});

describe('processRelativeTime', () => {
  let mockElement;
  let mockParent;
  let mockGrandParent;

  beforeEach(() => {
    // Setup DOM mocks
    mockElement = {
      hasAttribute: jest.fn().mockReturnValue(false),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      parentNode: null
    };

    mockParent = {
      parentNode: null,
      nextSibling: null
    };

    mockGrandParent = {
      insertBefore: jest.fn()
    };

    mockElement.parentNode = mockParent;
    mockParent.parentNode = mockGrandParent;

    // Mock console methods
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should skip already processed elements', () => {
    mockElement.hasAttribute.mockReturnValue(true);

    processRelativeTime(mockElement);

    expect(mockElement.getAttribute).not.toHaveBeenCalled();
    expect(mockGrandParent.insertBefore).not.toHaveBeenCalled();
  });

  it('should skip elements without datetime attribute', () => {
    mockElement.getAttribute.mockReturnValue(null);

    processRelativeTime(mockElement);

    expect(mockGrandParent.insertBefore).not.toHaveBeenCalled();
    expect(mockElement.setAttribute).not.toHaveBeenCalled();
  });

  it('should process valid relative-time element', () => {
    mockElement.getAttribute.mockReturnValue('2024-03-15T10:30:45Z');

    processRelativeTime(mockElement);

    expect(mockGrandParent.insertBefore).toHaveBeenCalledTimes(1);
    expect(mockElement.setAttribute).toHaveBeenCalledWith('data-gh-hyper-processed', 'true');

    const insertedSpan = mockGrandParent.insertBefore.mock.calls[0][0];
    expect(insertedSpan.className).toBe('gh-hyper-absolute-time');
    expect(insertedSpan.textContent).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(insertedSpan.style.display).toBe('block');
    expect(insertedSpan.style.fontSize).toBe('10px');
    // Color is converted from hex to rgb by JSDOM
    expect(insertedSpan.style.color).toBe('rgb(101, 109, 118)');
    expect(insertedSpan.style.marginLeft).toBe('2px');
  });

  it('should handle missing parent', () => {
    mockElement.getAttribute.mockReturnValue('2024-03-15T10:30:45Z');
    mockElement.parentNode = null;

    processRelativeTime(mockElement);

    expect(console.warn).toHaveBeenCalledWith(
      'GitHub Hyper: Could not find parent for relative-time element'
    );
    expect(mockElement.setAttribute).not.toHaveBeenCalled();
  });

  it('should handle missing grandparent', () => {
    mockElement.getAttribute.mockReturnValue('2024-03-15T10:30:45Z');
    mockParent.parentNode = null;

    processRelativeTime(mockElement);

    expect(console.warn).toHaveBeenCalledWith(
      'GitHub Hyper: Could not find parent for relative-time element'
    );
    expect(mockElement.setAttribute).not.toHaveBeenCalled();
  });

  it('should handle errors during processing', () => {
    mockElement.getAttribute.mockReturnValue('2024-03-15T10:30:45Z');
    // Mock document.createElement to throw an error
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn().mockImplementation(() => {
      throw new Error('DOM error');
    });

    processRelativeTime(mockElement);

    expect(console.error).toHaveBeenCalledWith(
      'GitHub Hyper: Error processing relative-time element',
      expect.any(Error)
    );

    // Restore
    document.createElement = originalCreateElement;
  });

  it('should insert span after parent nextSibling', () => {
    const mockNextSibling = {};
    mockParent.nextSibling = mockNextSibling;
    mockElement.getAttribute.mockReturnValue('2024-03-15T10:30:45Z');

    processRelativeTime(mockElement);

    expect(mockGrandParent.insertBefore).toHaveBeenCalledWith(
      expect.any(Object),
      mockNextSibling
    );
  });
});

describe('processAllRelativeTimes', () => {
  let mockElements;
  let querySelectorAllSpy;

  beforeEach(() => {
    mockElements = [
      {
        hasAttribute: jest.fn().mockReturnValue(false),
        getAttribute: jest.fn().mockReturnValue('2024-03-15T10:30:45Z'),
        setAttribute: jest.fn(),
        parentNode: {
          parentNode: {
            insertBefore: jest.fn()
          },
          nextSibling: null
        }
      },
      {
        hasAttribute: jest.fn().mockReturnValue(false),
        getAttribute: jest.fn().mockReturnValue('2024-03-16T11:30:45Z'),
        setAttribute: jest.fn(),
        parentNode: {
          parentNode: {
            insertBefore: jest.fn()
          },
          nextSibling: null
        }
      }
    ];

    querySelectorAllSpy = jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockElements);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should process all relative-time elements', () => {
    processAllRelativeTimes();

    expect(querySelectorAllSpy).toHaveBeenCalledWith('relative-time');
    expect(mockElements[0].setAttribute).toHaveBeenCalledWith('data-gh-hyper-processed', 'true');
    expect(mockElements[1].setAttribute).toHaveBeenCalledWith('data-gh-hyper-processed', 'true');
  });

  it('should handle empty NodeList', () => {
    querySelectorAllSpy.mockReturnValue([]);

    expect(() => processAllRelativeTimes()).not.toThrow();
  });
});

describe('initObserver', () => {
  let mockObserver;
  let observerCallback;

  beforeEach(() => {
    mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn()
    };

    global.MutationObserver = jest.fn().mockImplementation((callback) => {
      observerCallback = callback;
      return mockObserver;
    });

    global.document = {
      body: {},
      querySelectorAll: jest.fn().mockReturnValue([])
    };

    global.Node = {
      ELEMENT_NODE: 1
    };

    jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize MutationObserver', () => {
    initObserver();

    expect(MutationObserver).toHaveBeenCalledTimes(1);
    expect(mockObserver.observe).toHaveBeenCalledWith(document.body, {
      childList: true,
      subtree: true
    });
  });

  it('should process added RELATIVE-TIME elements', () => {
    initObserver();

    const mockRelativeTimeNode = {
      nodeType: 1, // ELEMENT_NODE
      tagName: 'RELATIVE-TIME',
      hasAttribute: jest.fn().mockReturnValue(false),
      getAttribute: jest.fn().mockReturnValue('2024-03-15T10:30:45Z'),
      setAttribute: jest.fn(),
      parentNode: {
        parentNode: {
          insertBefore: jest.fn()
        },
        nextSibling: null
      },
      querySelectorAll: jest.fn().mockReturnValue([])
    };

    const mutations = [{
      addedNodes: [mockRelativeTimeNode]
    }];

    observerCallback(mutations);

    expect(mockRelativeTimeNode.setAttribute).toHaveBeenCalledWith('data-gh-hyper-processed', 'true');
  });

  it('should process relative-time elements within added nodes', () => {
    initObserver();

    const mockChildRelativeTime = {
      hasAttribute: jest.fn().mockReturnValue(false),
      getAttribute: jest.fn().mockReturnValue('2024-03-15T10:30:45Z'),
      setAttribute: jest.fn(),
      parentNode: {
        parentNode: {
          insertBefore: jest.fn()
        },
        nextSibling: null
      }
    };

    const mockContainerNode = {
      nodeType: 1, // ELEMENT_NODE
      tagName: 'DIV',
      querySelectorAll: jest.fn().mockReturnValue([mockChildRelativeTime])
    };

    const mutations = [{
      addedNodes: [mockContainerNode]
    }];

    observerCallback(mutations);

    expect(mockContainerNode.querySelectorAll).toHaveBeenCalledWith('relative-time');
    expect(mockChildRelativeTime.setAttribute).toHaveBeenCalledWith('data-gh-hyper-processed', 'true');
  });

  it('should skip non-element nodes', () => {
    initObserver();

    const mockTextNode = {
      nodeType: 3 // TEXT_NODE
    };

    const mutations = [{
      addedNodes: [mockTextNode]
    }];

    expect(() => observerCallback(mutations)).not.toThrow();
  });

  it('should handle multiple mutations', () => {
    initObserver();

    const mockNode1 = {
      nodeType: 1,
      tagName: 'RELATIVE-TIME',
      hasAttribute: jest.fn().mockReturnValue(false),
      getAttribute: jest.fn().mockReturnValue('2024-03-15T10:30:45Z'),
      setAttribute: jest.fn(),
      parentNode: {
        parentNode: { insertBefore: jest.fn() },
        nextSibling: null
      },
      querySelectorAll: jest.fn().mockReturnValue([])
    };

    const mockNode2 = {
      nodeType: 1,
      tagName: 'RELATIVE-TIME',
      hasAttribute: jest.fn().mockReturnValue(false),
      getAttribute: jest.fn().mockReturnValue('2024-03-16T10:30:45Z'),
      setAttribute: jest.fn(),
      parentNode: {
        parentNode: { insertBefore: jest.fn() },
        nextSibling: null
      },
      querySelectorAll: jest.fn().mockReturnValue([])
    };

    const mutations = [
      { addedNodes: [mockNode1] },
      { addedNodes: [mockNode2] }
    ];

    observerCallback(mutations);

    expect(mockNode1.setAttribute).toHaveBeenCalledWith('data-gh-hyper-processed', 'true');
    expect(mockNode2.setAttribute).toHaveBeenCalledWith('data-gh-hyper-processed', 'true');
  });
});

describe('init', () => {
  let querySelectorAllSpy;
  let MutationObserverMock;

  beforeEach(() => {
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn()
        }
      }
    };

    querySelectorAllSpy = jest.spyOn(document, 'querySelectorAll').mockReturnValue([]);

    MutationObserverMock = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn()
    }));
    global.MutationObserver = MutationObserverMock;

    global.Node = {
      ELEMENT_NODE: 1
    };

    global.console.log = jest.fn();
    global.console.error = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.chrome;
  });

  it('should initialize when feature is enabled', async () => {
    chrome.storage.sync.get.mockResolvedValue({ enableAbsoluteTime: true });

    await init();

    expect(chrome.storage.sync.get).toHaveBeenCalledWith({ enableAbsoluteTime: true });
    expect(querySelectorAllSpy).toHaveBeenCalledWith('relative-time');
    expect(MutationObserverMock).toHaveBeenCalled();
  });

  it('should not initialize when feature is disabled', async () => {
    chrome.storage.sync.get.mockResolvedValue({ enableAbsoluteTime: false });

    await init();

    expect(chrome.storage.sync.get).toHaveBeenCalledWith({ enableAbsoluteTime: true });
    expect(console.log).toHaveBeenCalledWith('GitHub Hyper: Absolute time feature is disabled');
    expect(querySelectorAllSpy).not.toHaveBeenCalled();
    expect(MutationObserverMock).not.toHaveBeenCalled();
  });

  it('should handle chrome.storage errors', async () => {
    const error = new Error('Storage error');
    chrome.storage.sync.get.mockRejectedValue(error);

    await init();

    expect(console.error).toHaveBeenCalledWith('GitHub Hyper: Error initializing:', error);
    expect(querySelectorAllSpy).not.toHaveBeenCalled();
  });

  it('should default to enabled when no setting exists', async () => {
    // When chrome.storage.sync.get is called with a default value,
    // it returns the default if no value is stored
    chrome.storage.sync.get.mockResolvedValue({ enableAbsoluteTime: true });

    await init();

    expect(querySelectorAllSpy).toHaveBeenCalledWith('relative-time');
    expect(MutationObserverMock).toHaveBeenCalled();
  });
});
