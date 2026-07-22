import { describe, expect, it } from "vitest";

import {
  createNoopWindowController,
  type WindowController,
} from "@/lib/window/window-controller";

// The noop controller is the non-Tauri fallback used when the app runs outside
// a Tauri window (browser/dev). It must satisfy the WindowController port with
// safe do-nothing behavior. These cases are ported from the app copies.
describe("createNoopWindowController", () => {
  // behavior
  it("should resolve isFullscreen to false", async () => {
    const controller: WindowController = createNoopWindowController();

    await expect(controller.isFullscreen()).resolves.toBe(false);
  });

  // side-effect-contract
  it("should resolve setFullscreen without throwing", async () => {
    const controller = createNoopWindowController();

    await expect(controller.setFullscreen(true)).resolves.toBeUndefined();
    await expect(controller.setFullscreen(false)).resolves.toBeUndefined();
  });

  // side-effect-contract
  it("should resolve onFullscreenChange to a safely callable no-op unsubscribe", async () => {
    const controller = createNoopWindowController();

    const unsubscribe = await controller.onFullscreenChange(() => {});

    expect(typeof unsubscribe).toBe("function");
    // The returned unsubscribe must be safe to call (no throw).
    expect(() => unsubscribe()).not.toThrow();
  });
});
