import { describe, expect, it, vi } from "vitest";

import {
  createNoopUpdateController,
  createUpdateController,
} from "@/lib/updater/update-controller";

// The controller is the NATIVE seam. pureui cannot import @tauri-apps, so
// `createUpdateController` takes injected `{ check, relaunch }` deps and maps the
// injected plugin update into a Tauri-free `UpdateInfo`. These tests drive it
// through hand-written recording fakes that play the role of the injected Tauri
// plugin-updater `check` (returning a plugin update whose `downloadAndInstall`
// streams the documented `Started -> Progress -> Finished` event sequence) and
// the injected `relaunch`. We assert observable behavior (mapped version, the
// reported percent sequence, null mapping) and the side-effect contract
// (injected relaunch invoked). We do NOT mock the controller itself.

// The plugin update download event stream shape (internal to the impl, mirrored
// here so the fake conforms to what the controller expects to consume).
type DownloadEvent =
  | { event: "Started"; data: { contentLength?: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

// A fake plugin update: its `downloadAndInstall` replays the given event stream
// into the controller-supplied event handler (like Tauri's real plugin update).
function createPluginUpdate(version: string, events: DownloadEvent[]) {
  const downloadAndInstall = vi.fn(
    async (onEvent: (event: DownloadEvent) => void): Promise<void> => {
      for (const event of events) {
        onEvent(event);
      }
    },
  );
  return { version, downloadAndInstall };
}

describe("createUpdateController", () => {
  // TC-001 (happy path) - behavior: version surfaced + percents contain 25 & end on 100.
  it("should surface the version and report percents containing 25 and ending on 100 when the stream carries contentLength 200 with chunks 50 then 150", async () => {
    const controller = createUpdateController({
      check: async () =>
        createPluginUpdate("0.2.0", [
          { event: "Started", data: { contentLength: 200 } },
          { event: "Progress", data: { chunkLength: 50 } },
          { event: "Progress", data: { chunkLength: 150 } },
          { event: "Finished" },
        ]),
      relaunch: vi.fn(async () => {}),
    });

    const info = await controller.check();
    expect(info).not.toBeNull();
    expect(info?.version).toBe("0.2.0");

    const percents: number[] = [];
    await info?.downloadAndInstall((pct) => percents.push(pct));

    expect(percents.every((p) => !Number.isNaN(p))).toBe(true);
    expect(percents).toContain(25);
    expect(percents.at(-1)).toBe(100);
  });

  // TC-002 (edge - missing contentLength) - behavior: never NaN, only final 100 reported.
  it("should report only 100 and never NaN when the Started event carries no contentLength", async () => {
    const controller = createUpdateController({
      check: async () =>
        createPluginUpdate("0.3.0", [
          { event: "Started", data: {} },
          { event: "Progress", data: { chunkLength: 50 } },
          { event: "Progress", data: { chunkLength: 60 } },
          { event: "Finished" },
        ]),
      relaunch: vi.fn(async () => {}),
    });

    const info = await controller.check();
    const percents: number[] = [];
    await info?.downloadAndInstall((pct) => percents.push(pct));

    expect(percents.some((p) => Number.isNaN(p))).toBe(false);
    expect(percents).toEqual([100]);
  });

  // TC-003 (edge - no update) - behavior: a null plugin check maps to a null UpdateInfo.
  it("should resolve check to null when the injected check resolves null", async () => {
    const controller = createUpdateController({
      check: async () => null,
      relaunch: vi.fn(async () => {}),
    });

    await expect(controller.check()).resolves.toBeNull();
  });

  // TC-004 (side-effect) - side-effect-contract: UpdateInfo.relaunch invokes the injected relaunch once.
  it("should invoke the injected relaunch exactly once when UpdateInfo.relaunch is called", async () => {
    const relaunch = vi.fn(async (): Promise<void> => {});
    const controller = createUpdateController({
      check: async () =>
        createPluginUpdate("0.2.0", [
          { event: "Started", data: { contentLength: 100 } },
          { event: "Finished" },
        ]),
      relaunch,
    });

    const info = await controller.check();
    expect(relaunch).not.toHaveBeenCalled();

    await info?.relaunch();

    expect(relaunch).toHaveBeenCalledTimes(1);
  });
});

describe("createNoopUpdateController", () => {
  // TC-005 (noop) - behavior: check resolves null (browser / jsdom / non-Tauri path), no deps needed.
  it("should resolve check to null with no injected native bindings", async () => {
    const controller = createNoopUpdateController();

    await expect(controller.check()).resolves.toBeNull();
  });
});
