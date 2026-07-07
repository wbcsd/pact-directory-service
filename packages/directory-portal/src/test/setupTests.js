import "@testing-library/jest-dom";

// Some UI libs read these; safe no-ops for tests.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Radix sometimes touches ResizeObserver; provide a lightweight polyfill.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = RO;
}

// (Optional) If any code needs TextEncoder/Decoder (Node 18+: global), uncomment for Node <= 16
// import { TextEncoder, TextDecoder } from "util";
// // @ts-ignore
// global.TextEncoder = TextEncoder as any;
// // @ts-ignore
// global.TextDecoder = TextDecoder as any;

// Mock static assets to simple strings (if you import images in components)
vi.mock(
  "../assets/pact-logistics-center-8.png",
  () => ({ default: "empty.png" }),
  { virtual: true }
);

// If your app imports CSS Modules or plain CSS from components, Vitest with `css: true` handles it.
// If you still want explicit mocks for CSS modules, you can add (rarely needed):
// vi.mock("*.module.css", () => ({}), { virtual: true });
