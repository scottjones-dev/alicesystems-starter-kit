import "@testing-library/jest-dom/vitest";

/*
 * jsdom has no layout engine, and Radix (selects, menus, tooltips) and Sonner expect a few
 * browser features it lacks. These stand-ins do nothing, which is enough to render a story.
 */

class ResizeObserverStub {
  disconnect() {
    // Nothing to stop: it never observes anything.
  }
  observe() {
    // Nothing to do: jsdom has no layout to measure.
  }
  unobserve() {
    // Nothing to do.
  }
}
globalThis.ResizeObserver = ResizeObserverStub;

window.matchMedia = (query: string) => ({
  addEventListener: () => undefined,
  addListener: () => undefined,
  dispatchEvent: () => false,
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: () => undefined,
  removeListener: () => undefined,
});

Element.prototype.scrollIntoView = () => undefined;
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => undefined;
