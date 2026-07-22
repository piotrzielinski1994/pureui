import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useIsMobile } from "@/lib/responsive/use-is-mobile";

// pureui's src/test/setup.ts has NO matchMedia stub, so we install a
// controllable one inline here (do NOT edit the global setup). Mirrors the
// pattern used by theme-context.test.tsx / puredeck's existing test. The hook
// queries the mobile breakpoint below; this stub reports matches for it and can
// fire a `change` event to drive the reactive path.
const MOBILE_QUERY = "(max-width: 767px)";

type MediaListener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: initialMatches,
    media: MOBILE_QUERY,
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener);
    },
    // legacy API some implementations call
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };

  window.matchMedia = ((query: string) => {
    void query;
    return mql;
  }) as unknown as typeof window.matchMedia;

  return {
    // Flip the media match and fire a `change` to all subscribers.
    setMatches(matches: boolean) {
      mql.matches = matches;
      for (const listener of listeners) {
        listener({ matches });
      }
    },
  };
}

afterEach(() => {
  // @ts-expect-error - clean the stub so a later test re-stubs from scratch.
  window.matchMedia = undefined;
});

describe("useIsMobile", () => {
  // TC-005 (mobile initial match) - behavior.
  it("should return true when matchMedia matches and false when it does not", () => {
    stubMatchMedia(true);
    const matching = renderHook(() => useIsMobile());
    expect(matching.result.current).toBe(true);

    matching.unmount();

    stubMatchMedia(false);
    const notMatching = renderHook(() => useIsMobile());
    expect(notMatching.result.current).toBe(false);
  });

  // TC-006 (mobile reactive) - behavior.
  it("should re-render reactively when the media query change event flips both directions", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => {
      media.setMatches(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      media.setMatches(false);
    });
    expect(result.current).toBe(false);
  });

  // TC-007 (mobile guard) - behavior.
  it("should return false and not throw when window.matchMedia is undefined", () => {
    // @ts-expect-error - simulate an environment without matchMedia (SSR/jsdom).
    window.matchMedia = undefined;

    let result: { current: boolean } | undefined;
    expect(() => {
      result = renderHook(() => useIsMobile()).result;
    }).not.toThrow();

    expect(result?.current).toBe(false);
  });
});
