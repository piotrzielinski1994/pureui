import { describe, expect, it, vi } from "vitest";
import {
  showUpdateToast,
  type UpdateToastHandle,
  type UpdateToastSink,
} from "@/lib/updater/show-update-toast";
import type { UpdateInfo } from "@/lib/updater/update-controller";

// The toast layer is the TOAST seam. pureui owns the FLOW (present once with the
// version + an "Update now" affordance, then on activation: report progress ->
// downloadAndInstall while updating the SAME handle -> installing() -> relaunch,
// install strictly before relaunch; a rejected download -> failed() and NO
// relaunch). pureui imports no toast lib - the presentation is injected as a
// `UpdateToastSink` port. These tests drive the flow through a hand-written
// recording fake sink (its returned handle records every call) and a recording
// update fake, then assert the ordered side-effect contract. We do NOT mock
// showUpdateToast itself.

type Recorder = { events: string[] };

type PresentArgs = { message: string; onUpdateNow: () => void };

// A recording fake sink: `present` logs its call + args and returns a handle
// whose progress/installing/failed all append to the shared event log, so we
// can assert cross-object ordering (download vs installing vs relaunch) and
// that the SAME handle is reused (present called exactly once).
function createRecordingSink(rec: Recorder) {
  const presentCalls: PresentArgs[] = [];
  const handles: UpdateToastHandle[] = [];
  const sink: UpdateToastSink = {
    present: (args: PresentArgs): UpdateToastHandle => {
      presentCalls.push(args);
      rec.events.push("present");
      const handle: UpdateToastHandle = {
        progress: (message: string) => rec.events.push(`progress:${message}`),
        installing: () => rec.events.push("installing"),
        failed: () => rec.events.push("failed"),
      };
      handles.push(handle);
      return handle;
    },
  };
  return { sink, presentCalls, handles };
}

// A recording update fake: downloadAndInstall optionally emits a progress pct
// then resolves (or rejects), relaunch just records. Both log to the shared
// recorder so ordering across the whole flow is observable.
function createUpdate(
  rec: Recorder,
  opts: {
    version: string;
    progressPct?: number;
    downloadRejects?: boolean;
  },
): UpdateInfo {
  const relaunch = vi.fn(async (): Promise<void> => {
    rec.events.push("relaunch");
  });
  const downloadAndInstall = vi.fn(
    async (onProgress: (pct: number) => void): Promise<void> => {
      rec.events.push("download:start");
      if (opts.progressPct !== undefined) {
        onProgress(opts.progressPct);
      }
      if (opts.downloadRejects) {
        throw new Error("download failed");
      }
      rec.events.push("download:done");
    },
  );
  return { version: opts.version, downloadAndInstall, relaunch };
}

describe("showUpdateToast", () => {
  // AC-008 - behavior: present is called exactly once, carrying a message that
  // includes the update version and an onUpdateNow function affordance.
  it("should call present exactly once with a message containing the version and an onUpdateNow action", () => {
    const rec: Recorder = { events: [] };
    const { sink, presentCalls } = createRecordingSink(rec);
    const update = createUpdate(rec, { version: "0.2.0" });

    showUpdateToast(sink, update);

    expect(presentCalls).toHaveLength(1);
    expect(presentCalls[0].message).toContain("0.2.0");
    expect(typeof presentCalls[0].onUpdateNow).toBe("function");
  });

  // TC-012 (toast - install then relaunch) - side-effect-contract: activating
  // onUpdateNow runs downloadAndInstall then relaunch, each once, install
  // strictly before relaunch, with installing() in between.
  it("should download and install before relaunching, each once, when onUpdateNow is activated", async () => {
    const rec: Recorder = { events: [] };
    const { sink, presentCalls } = createRecordingSink(rec);
    const update = createUpdate(rec, { version: "0.2.0" });

    showUpdateToast(sink, update);
    presentCalls[0].onUpdateNow();

    await vi.waitFor(() => expect(rec.events).toContain("relaunch"));

    expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(update.relaunch).toHaveBeenCalledTimes(1);
    const downloadIdx = rec.events.indexOf("download:start");
    const installingIdx = rec.events.indexOf("installing");
    const relaunchIdx = rec.events.indexOf("relaunch");
    expect(downloadIdx).toBeGreaterThanOrEqual(0);
    expect(downloadIdx).toBeLessThan(installingIdx);
    expect(installingIdx).toBeLessThan(relaunchIdx);
  });

  // TC-013 (toast - progress label on same toast) - behavior: a progress event
  // updates the SAME handle with a "Downloading… NN%" label (no second present),
  // and an initial 0% is reported before the download begins.
  it("should update the same toast with a Downloading NN% label and never present a second toast", async () => {
    const rec: Recorder = { events: [] };
    const { sink, presentCalls } = createRecordingSink(rec);
    const update = createUpdate(rec, { version: "0.2.0", progressPct: 42 });

    showUpdateToast(sink, update);
    presentCalls[0].onUpdateNow();

    await vi.waitFor(() => expect(rec.events).toContain("relaunch"));

    // present() happened once only - the progress runs on the same handle.
    expect(presentCalls).toHaveLength(1);
    const progressEvents = rec.events.filter((e) => e.startsWith("progress:"));
    expect(progressEvents.some((e) => /Downloading\D*0%/.test(e))).toBe(true);
    expect(progressEvents.some((e) => /Downloading\D*42%/.test(e))).toBe(true);
    // The initial 0% is reported before the download actually starts.
    const zeroIdx = rec.events.findIndex((e) => /Downloading\D*0%/.test(e));
    const downloadIdx = rec.events.indexOf("download:start");
    expect(zeroIdx).toBeGreaterThanOrEqual(0);
    expect(zeroIdx).toBeLessThan(downloadIdx);
  });

  // AC-008 (failure branch) - side-effect-contract: a rejected downloadAndInstall
  // drives handle.failed() and NEVER relaunches.
  it("should call failed and never relaunch when downloadAndInstall rejects", async () => {
    const rec: Recorder = { events: [] };
    const { sink, presentCalls } = createRecordingSink(rec);
    const update = createUpdate(rec, {
      version: "0.2.0",
      downloadRejects: true,
    });

    showUpdateToast(sink, update);
    presentCalls[0].onUpdateNow();

    await vi.waitFor(() => expect(rec.events).toContain("failed"));

    expect(update.relaunch).not.toHaveBeenCalled();
    expect(rec.events).not.toContain("relaunch");
    expect(rec.events).not.toContain("installing");
  });
});
