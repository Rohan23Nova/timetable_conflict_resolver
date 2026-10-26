import "@testing-library/jest-dom";

// Mock in-memory localStorage for Node v26+ compatibility
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

if (typeof global !== "undefined") {
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
}

// Mock matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver for React Flow
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;
if (typeof global !== "undefined") {
  (global as any).ResizeObserver = (global as any).ResizeObserver || ResizeObserverMock;
}

// Mock DOMMatrixReadOnly
if (typeof window.DOMMatrixReadOnly === "undefined") {
  (window as any).DOMMatrixReadOnly = class {
    m22 = 1;
    transformPoint(point: any) {
      return point;
    }
  };
}

