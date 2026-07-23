import { useEffect, useRef } from "react";
import {
  showUpdateToast,
  type UpdateToastSink,
} from "@/lib/updater/show-update-toast";
import type { UpdateController } from "@/lib/updater/update-controller";

// Mount-only bridge (sibling of WindowFullscreenSync): runs one update check on
// mount via the injected controller and, on an available update, drives the
// injected toast sink through the download/install/relaunch flow. Renders
// nothing. A failed check is swallowed - the app behaves as if no update exists.
// The ref guard keeps the check to exactly once across re-renders (and
// StrictMode's double-mount).
export function UpdateChecker({
  controller,
  sink,
}: {
  controller: UpdateController;
  sink: UpdateToastSink;
}): null {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) {
      return;
    }
    hasChecked.current = true;
    controller
      .check()
      .then((update) => {
        if (update !== null) {
          showUpdateToast(sink, update);
        }
      })
      .catch(() => {});
  }, [controller, sink]);

  return null;
}
