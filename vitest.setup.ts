// Global test setup: localStorage mock and window object for all tests
const mockStorage: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  },
  length: Object.keys(mockStorage).length,
  key: (index: number) => {
    const keys = Object.keys(mockStorage);
    return keys[index] ?? null;
  },
};

// Mock window object for the test environment
(globalThis as any).window = {
  localStorage: localStorageMock,
  location: {
    hostname: 'localhost',
    pathname: '/',
  },
  YT: undefined,
  onYouTubeIframeAPIReady: undefined,
};

// Also set localStorage on global for compatibility
(globalThis as any).localStorage = localStorageMock;
