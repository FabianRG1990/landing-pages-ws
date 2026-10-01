import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed({ zoneless: false });

// jsdom ships neither observer, and the hero, the book and the nav all
// construct one on init. Stubbed here rather than per spec: nothing asserts
// on scroll or resize behaviour, it only has to not throw.
class ObserverStub {
  observe() {
    /* no-op */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
  takeRecords() {
    return [];
  }
}

const globals = globalThis as unknown as Record<string, unknown>;
globals['IntersectionObserver'] ??= ObserverStub;
globals['ResizeObserver'] ??= ObserverStub;

// Nor matchMedia, which the hero and the nav read for reduced motion and
// pointer type. An always-false query is enough: the specs only create.
globals['matchMedia'] ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {
    /* no-op */
  },
  removeEventListener() {
    /* no-op */
  },
  addListener() {
    /* no-op */
  },
  removeListener() {
    /* no-op */
  },
  dispatchEvent() {
    return false;
  },
});
