// Port for the native window's fullscreen state. The Tauri app build supplies a
// real controller wrapping the current window; browser/test builds use the noop.
// Kept behind a port so the window-state sync hook stays unit-testable without a
// real webview - and so this library depends on NO Tauri API (the concrete Tauri
// `createWindowController` factory lives in each consuming app).
export type WindowController = {
  isFullscreen: () => Promise<boolean>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
  // Notifies with the NEW fullscreen value whenever it changes; returns an
  // unsubscribe. Tauri has no dedicated fullscreen event, so changes are derived
  // from the window resize stream (filtered to actual flips).
  onFullscreenChange: (
    listener: (fullscreen: boolean) => void,
  ) => Promise<() => void>;
};

// The slice of the Tauri Window a real controller depends on - narrowed so a fake
// can stand in. The app's `createWindowController` consumes this shape.
export type TauriWindow = {
  isFullscreen: () => Promise<boolean>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
  onResized: (handler: () => void) => Promise<() => void>;
};

export function createNoopWindowController(): WindowController {
  return {
    isFullscreen: () => Promise.resolve(false),
    setFullscreen: () => Promise.resolve(),
    onFullscreenChange: () => Promise.resolve(() => {}),
  };
}
