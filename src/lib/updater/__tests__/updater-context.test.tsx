import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { UpdateController } from "@/lib/updater/update-controller";
import {
  type UpdaterContextValue,
  UpdaterProvider,
  useUpdater,
} from "@/lib/updater/updater-context";

// UpdaterProvider supplies { controller, getVersion } to descendants; useUpdater
// reads them. With NO provider mounted it must default to a noop controller
// (check -> null) + the fallback version getter (-> "dev"). These tests read the
// context through probe components that surface resolved values into the DOM
// (the project probe pattern; react-hooks lint forbids mutating an outer binding
// from inside a component). We assert observable behavior only.

function createFakeController(): UpdateController {
  return { check: vi.fn(async () => null) };
}

// Reads the context value, surfaces the injected getVersion's resolved string,
// and a marker proving a real controller came through (so we can tell the
// provider threaded its deps, not the defaults).
function UpdaterProbe() {
  const value: UpdaterContextValue = useUpdater();
  const [version, setVersion] = useState("");
  useEffect(() => {
    value.getVersion().then(setVersion);
  }, [value]);
  return (
    <div>
      <span data-testid="controller-check">
        {typeof value.controller.check}
      </span>
      <span data-testid="version">{version}</span>
    </div>
  );
}

describe("UpdaterProvider / useUpdater", () => {
  // AC-006 - behavior: the provider threads its injected controller + getVersion
  // down to a descendant reading them via useUpdater.
  it("should supply the injected controller and getVersion to descendants", async () => {
    const controller = createFakeController();
    const getVersion = vi.fn(async () => "9.9.9");

    render(
      <UpdaterProvider controller={controller} getVersion={getVersion}>
        <UpdaterProbe />
      </UpdaterProvider>,
    );

    expect(screen.getByTestId("controller-check")).toHaveTextContent(
      "function",
    );
    await waitFor(() =>
      expect(screen.getByTestId("version")).toHaveTextContent("9.9.9"),
    );
    expect(getVersion).toHaveBeenCalled();
  });

  // TC-007 (context default) - behavior: with NO provider mounted, useUpdater
  // defaults to a noop controller (check -> null) + the fallback getter (-> dev).
  it("should default to a noop controller and the dev fallback version when no provider is mounted", async () => {
    let checkResult: unknown = "unset";

    function DefaultProbe() {
      const { controller, getVersion } = useUpdater();
      const [version, setVersion] = useState("");
      useEffect(() => {
        controller.check().then((r) => {
          checkResult = r;
        });
        getVersion().then(setVersion);
      }, [controller, getVersion]);
      return <span data-testid="default-version">{version}</span>;
    }

    render(<DefaultProbe />);

    await waitFor(() =>
      expect(screen.getByTestId("default-version")).toHaveTextContent("dev"),
    );
    await waitFor(() => expect(checkResult).toBeNull());
  });
});
