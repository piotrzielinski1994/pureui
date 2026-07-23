import type { UpdateInfo } from "@/lib/updater/update-controller";

// The TOAST seam. pureui owns the update FLOW and the common label text but
// imports NO toast library - the presentation is injected as an
// `UpdateToastSink` port. `present` shows the "Update available" toast and
// returns a semantic handle; pureui drives that handle through the
// download/install/relaunch lifecycle. A semantic handle (not a message-only
// sink) lets each app render or no-op the `installing`/`failed` steps to match
// its own toast semantics (sonner renders them; pureplayer omits them).
export type UpdateToastHandle = {
  progress: (message: string) => void;
  installing: () => void;
  failed: () => void;
};

export type UpdateToastSink = {
  present: (args: {
    message: string;
    onUpdateNow: () => void;
  }) => UpdateToastHandle;
};

async function runUpdate(update: UpdateInfo, handle: UpdateToastHandle) {
  handle.progress("Downloading… 0%");
  await update.downloadAndInstall((pct) =>
    handle.progress(`Downloading… ${pct}%`),
  );
  handle.installing();
  await update.relaunch();
}

// Shows the persistent "Update available" toast whose action downloads/installs
// the update and relaunches. Shared by the startup checker and the Settings
// Updates section so both drive the same flow (install strictly before
// relaunch; a failed download reports `failed()` and never relaunches).
export function showUpdateToast(
  sink: UpdateToastSink,
  update: UpdateInfo,
): UpdateToastHandle {
  const handle = sink.present({
    message: `Update available: ${update.version}`,
    onUpdateNow: () => {
      runUpdate(update, handle).catch(() => handle.failed());
    },
  });
  return handle;
}
