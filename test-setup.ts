import { vi } from "vitest";

// Set up environment variables for testing
process.env.NODE_ENV = "test";
process.env.API_KEY = "test-api-key";
process.env.APPCHECK_DEBUG_TOKEN = "test-debug-token";
process.env.RECAPTCHA_KEY = "test-recaptcha-key";

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  assert: vi.fn(),
};

// Mock Firebase methods that might cause issues in tests
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  signInAnonymously: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
}));

// Mock Intersection Observer for components that use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
  root: null,
  rootMargin: "0px",
  thresholds: [],
  takeRecords: vi.fn(() => []),
})) as any;

// Mock requestAnimationFrame for animations
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock middleware to prevent auth checks during tests
vi.mock("~/middleware/auth.ts", () => ({
  default: vi.fn(),
}));

// Mock getCurrentUser from nuxt-vuefire
vi.mock("#imports", async () => {
  const actual = await vi.importActual("#imports");
  return {
    ...actual,
    getCurrentUser: vi.fn(() => Promise.resolve(null)),
  };
});
