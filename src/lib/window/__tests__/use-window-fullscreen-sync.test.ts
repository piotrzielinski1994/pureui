import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useWindowFullscreenSync } from "@/lib/window/use-window-fullscreen-sync";
import type { WindowController } from "@/lib/window/window-controller";

// A hand-written fake WindowController (do NOT mock the hook itself). It lets a
// test capture the fullscreen-change listener and drive it, spies on
// setFullscreen, and returns a promise resolving to a spy unsubscribe fn so we
// can assert the mount-once subscribe/restore + unmount teardown contract.
function createFakeController() {
  const setFullscreen = vi.fn(async (_value: boolean): Promise<void> => {});
  const unsubscribe = vi.fn();
  let capturedListener: ((value: boolean) => void) | undefined;

  const onFullscreenChange = vi.fn(
    async (listener: (value: boolean) => void): Promise<() => void> => {
      capturedListener = listener;
      return unsubscribe;
    },
  );

  const isFullscreen = vi.fn(async (): Promise<boolean> => false);

  const controller = {
    isFullscreen,
    setFullscreen,
    onFullscreenChange,
  } satisfies WindowController;

  return {
    controller,
    setFullscreen,
    onFullscreenChange,
    unsubscribe,
    // Drive the native fullscreen-change event the hook subscribed to.
    emit(value: boolean) {
      if (!capturedListener) {
        throw new Error("emit called before the hook subscribed a listener");
      }
      capturedListener(value);
    },
  };
}

// Flush the async setup inside the mount effect (setFullscreen + the
// onFullscreenChange promise that resolves to the unsubscribe fn).
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useWindowFullscreenSync", () => {
  // TC-001 (fullscreen restore, happy) - side-effect-contract.
  it("should restore a saved-true fullscreen exactly once on mount and not persist a flip that matches saved", async () => {
    const fake = createFakeController();
    const onSave = vi.fn();

    renderHook(() =>
      useWindowFullscreenSync({
        controller: fake.controller,
        saved: true,
        onSave,
      }),
    );

    await waitFor(() =>
      expect(fake.onFullscreenChange).toHaveBeenCalledTimes(1),
    );
    expect(fake.setFullscreen).toHaveBeenCalledTimes(1);
    expect(fake.setFullscreen).toHaveBeenCalledWith(true);

    // A later change that equals saved must NOT trigger a persist.
    act(() => {
      fake.emit(true);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  // TC-002 (fullscreen no-force) - side-effect-contract.
  it("should never force fullscreen on mount when saved is false and should persist a change that differs from saved", async () => {
    const fake = createFakeController();
    const onSave = vi.fn();

    renderHook(() =>
      useWindowFullscreenSync({
        controller: fake.controller,
        saved: false,
        onSave,
      }),
    );

    await waitFor(() =>
      expect(fake.onFullscreenChange).toHaveBeenCalledTimes(1),
    );
    // Don't fight an OS-opened fullscreen: no restore when saved=false.
    expect(fake.setFullscreen).not.toHaveBeenCalled();

    act(() => {
      fake.emit(true);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(true);
  });

  // TC-003 (fullscreen prop churn) - behavior.
  it("should not re-run the mount effect on prop churn but should use the latest onSave compared against the latest saved", async () => {
    const fake = createFakeController();
    const onSaveInitial = vi.fn();

    const { rerender } = renderHook(
      ({
        saved,
        onSave,
      }: {
        saved: boolean;
        onSave: (value: boolean) => void;
      }) =>
        useWindowFullscreenSync({ controller: fake.controller, saved, onSave }),
      { initialProps: { saved: false, onSave: onSaveInitial } },
    );

    await waitFor(() =>
      expect(fake.onFullscreenChange).toHaveBeenCalledTimes(1),
    );

    // Re-render with a NEW onSave AND a new saved value (same controller ref).
    const onSaveLatest = vi.fn();
    rerender({ saved: true, onSave: onSaveLatest });
    await flushMicrotasks();

    // The mount effect must NOT re-run: no duplicate subscribe, and the
    // restore does not retroactively fire for the newly-flipped saved value.
    expect(fake.onFullscreenChange).toHaveBeenCalledTimes(1);
    expect(fake.setFullscreen).not.toHaveBeenCalled();

    // A change differing from the LATEST saved(true) routes to the LATEST onSave.
    act(() => {
      fake.emit(false);
    });

    expect(onSaveInitial).not.toHaveBeenCalled();
    expect(onSaveLatest).toHaveBeenCalledTimes(1);
    expect(onSaveLatest).toHaveBeenCalledWith(false);
  });

  // TC-004 (fullscreen unsubscribe) - side-effect-contract.
  it("should invoke the unsubscribe fn returned by onFullscreenChange on unmount", async () => {
    const fake = createFakeController();
    const onSave = vi.fn();

    const { unmount } = renderHook(() =>
      useWindowFullscreenSync({
        controller: fake.controller,
        saved: false,
        onSave,
      }),
    );

    await waitFor(() =>
      expect(fake.onFullscreenChange).toHaveBeenCalledTimes(1),
    );
    // Ensure the onFullscreenChange promise has resolved to the unsubscribe fn.
    await flushMicrotasks();
    expect(fake.unsubscribe).not.toHaveBeenCalled();

    unmount();

    await waitFor(() => expect(fake.unsubscribe).toHaveBeenCalledTimes(1));
  });
});
