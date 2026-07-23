import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { UpdateToastSink } from "@/lib/updater/show-update-toast";
import { UpdateChecker } from "@/lib/updater/update-checker";
import type {
  UpdateController,
  UpdateInfo,
} from "@/lib/updater/update-controller";

// UpdateChecker runs a single ref-guarded check on mount, renders null, and on
// an available update drives showUpdateToast(sink, update). A rejected check is
// swallowed (no throw, no toast). These tests drive the component through a
// hand-written fake controller and a recording fake sink, asserting the
// observable outcome (nothing rendered) and the side-effect contract (check
// called once across a re-render; present called only on an available update).
// We do NOT mock UpdateChecker or showUpdateToast.

type PresentArgs = { message: string; onUpdateNow: () => void };

function createRecordingSink() {
  const presentCalls: PresentArgs[] = [];
  const sink: UpdateToastSink = {
    present: (args: PresentArgs) => {
      presentCalls.push(args);
      return {
        progress: () => {},
        installing: () => {},
        failed: () => {},
      };
    },
  };
  return { sink, presentCalls };
}

function createAvailableUpdate(version: string): UpdateInfo {
  return {
    version,
    downloadAndInstall: vi.fn(async () => {}),
    relaunch: vi.fn(async () => {}),
  };
}

describe("UpdateChecker", () => {
  // TC-008 (checker - once on mount) - side-effect-contract + behavior: check
  // is called exactly once even under StrictMode's double-mount and across a
  // re-render (proving the ref-guard, not just an empty-deps effect), and the
  // component renders nothing (null).
  it("should call the controller check exactly once across StrictMode double-mount and a re-render, and render nothing", async () => {
    const check = vi.fn(async (): Promise<UpdateInfo | null> => null);
    const controller: UpdateController = { check };
    const { sink } = createRecordingSink();

    const { container, rerender } = render(
      <StrictMode>
        <UpdateChecker controller={controller} sink={sink} />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <UpdateChecker controller={controller} sink={sink} />
      </StrictMode>,
    );

    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));
    expect(check).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
  });

  // TC-009 (checker - available update) - side-effect-contract: an available
  // update drives the toast once, carrying the update version.
  it("should present a toast carrying the version exactly once when an update is available", async () => {
    const controller: UpdateController = {
      check: vi.fn(async () => createAvailableUpdate("0.2.0")),
    };
    const { sink, presentCalls } = createRecordingSink();

    render(<UpdateChecker controller={controller} sink={sink} />);

    await waitFor(() => expect(presentCalls).toHaveLength(1));
    expect(presentCalls).toHaveLength(1);
    expect(presentCalls[0].message).toContain("0.2.0");
  });

  // TC-010 (checker - no update) - side-effect-contract: a null update shows no
  // toast at all.
  it("should present no toast when the check resolves to null", async () => {
    const check = vi.fn(async (): Promise<UpdateInfo | null> => null);
    const controller: UpdateController = { check };
    const { sink, presentCalls } = createRecordingSink();

    render(<UpdateChecker controller={controller} sink={sink} />);

    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));
    // Give any microtasks after the resolved check a chance to run.
    await Promise.resolve();
    expect(presentCalls).toHaveLength(0);
  });

  // TC-011 (checker - failed check swallowed) - behavior: a rejected check is
  // swallowed (no throw) and shows no toast.
  it("should swallow a rejected check without throwing and present no toast", async () => {
    const check = vi.fn(async (): Promise<UpdateInfo | null> => {
      throw new Error("check failed");
    });
    const controller: UpdateController = { check };
    const { sink, presentCalls } = createRecordingSink();

    expect(() =>
      render(<UpdateChecker controller={controller} sink={sink} />),
    ).not.toThrow();

    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(presentCalls).toHaveLength(0);
  });
});
