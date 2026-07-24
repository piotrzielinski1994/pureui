import { formatForDisplay } from "@tanstack/hotkeys";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ShortcutRow } from "@/components/shortcuts/shortcut-row";

// R6b - ShortcutRow superset behavior (TC-003..TC-011). The component is the
// SUT: only its injected collaborators (store mutators, findConflict, actionName)
// are synthetic. NO app registry is imported - a small local {id,name} list, a
// synthetic effective map and a real (non-mocked) findConflict stand in.
//
// jsdom reports a non-mac platform, so Mod records as Control (learnings): the
// recorder canonicalizes `{Control>}j{/Control}` to the "Mod+J" binding.

type ActionId = "new-request" | "send-request" | "flip-card";

const NEW_REQUEST = { id: "new-request" as const, name: "New request" };

const EFFECTIVE: Record<ActionId, string[]> = {
  "new-request": ["Mod+N"],
  "send-request": ["Mod+S"],
  "flip-card": [],
};

const ACTION_NAMES: Record<ActionId, string> = {
  "new-request": "New request",
  "send-request": "Send request",
  "flip-card": "Flip card",
};

// A real conflict query over the passed effective map (transparent, per the
// injected-resolver contract): another action owning the hotkey is a conflict.
function findConflict(
  hotkey: string,
  forAction: ActionId,
  effective: Record<ActionId, string[]>,
): ActionId | null {
  for (const id of Object.keys(effective) as ActionId[]) {
    if (id !== forAction && effective[id].includes(hotkey)) {
      return id;
    }
  }
  return null;
}

const actionName = (id: ActionId): string => ACTION_NAMES[id] ?? id;

function makeStore() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    replace: vi.fn(),
    reset: vi.fn(),
  };
}

type RenderOverrides = {
  action?: { id: ActionId; name: string };
  bindings?: string[];
  effective?: Record<ActionId, string[]>;
  hasOverride?: boolean;
};

function renderRow(overrides: RenderOverrides = {}) {
  const store = makeStore();
  const props = {
    action: overrides.action ?? NEW_REQUEST,
    bindings: overrides.bindings ?? ["Mod+N"],
    effective: overrides.effective ?? EFFECTIVE,
    hasOverride: overrides.hasOverride ?? false,
    store,
    findConflict,
    actionName,
  };

  const result = render(
    <HotkeysProvider>
      <ShortcutRow {...props} />
    </HotkeysProvider>,
  );

  return { ...result, store };
}

describe("ShortcutRow", () => {
  // TC-003 - behavior
  it("should render each binding as an Edit chip, a × Remove control, and an Add button", () => {
    renderRow({ bindings: ["Mod+N"] });

    const display = formatForDisplay("Mod+N");

    const editButton = screen.getByRole("button", {
      name: `Edit ${display} for New request`,
    });
    expect(editButton).toHaveTextContent(display);
    expect(
      screen.getByRole("button", {
        name: `Remove ${display} from New request`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    ).toBeInTheDocument();
  });

  // TC-004 - behavior: Add arms the recorder and shows a trailing placeholder.
  it("should arm the recorder and show a trailing Press keys placeholder when Add is pressed", async () => {
    const user = userEvent.setup();
    renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    );

    // The existing chip stays and a trailing recording slot appears.
    expect(screen.getByText(formatForDisplay("Mod+N"))).toBeInTheDocument();
    expect(await screen.findByText("Press keys…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  // TC-004 - side-effect-contract
  it("should call store.add with the action id and a non-conflicting hotkey when Add records a new binding", async () => {
    const user = userEvent.setup();
    const { store } = renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    );
    // Mod+J is unused by any action -> free.
    await user.keyboard("{Control>}j{/Control}");

    await waitFor(() => {
      expect(store.add).toHaveBeenCalledWith("new-request", "Mod+J");
    });
    expect(store.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // TC-005 - side-effect-contract: Edit re-records in place -> replace, not add.
  it("should call store.replace with the old and new hotkey when a chip is edited in place", async () => {
    const user = userEvent.setup();
    const { store } = renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", {
        name: `Edit ${formatForDisplay("Mod+N")} for New request`,
      }),
    );
    // The edited chip's label is replaced by the recorder placeholder.
    expect(await screen.findByText("Press keys…")).toBeInTheDocument();

    await user.keyboard("{Control>}j{/Control}");

    await waitFor(() => {
      expect(store.replace).toHaveBeenCalledWith(
        "new-request",
        "Mod+N",
        "Mod+J",
      );
    });
    expect(store.add).not.toHaveBeenCalled();
  });

  // TC-006 - side-effect-contract: Remove drops exactly the clicked binding.
  it("should call store.remove with just the clicked binding when its × is pressed", async () => {
    const user = userEvent.setup();
    const { store } = renderRow({
      bindings: ["Mod+N", "Mod+J"],
      effective: { ...EFFECTIVE, "new-request": ["Mod+N", "Mod+J"] },
    });

    await user.click(
      screen.getByRole("button", {
        name: `Remove ${formatForDisplay("Mod+N")} from New request`,
      }),
    );

    expect(store.remove).toHaveBeenCalledTimes(1);
    expect(store.remove).toHaveBeenCalledWith("new-request", "Mod+N");
    expect(store.add).not.toHaveBeenCalled();
    expect(store.replace).not.toHaveBeenCalled();
  });

  // TC-007 - behavior
  it("should show a (disabled) marker and no chip when the action has no bindings", () => {
    renderRow({ bindings: [], action: { id: "flip-card", name: "Flip card" } });

    expect(screen.getByText("(disabled)")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Edit / }),
    ).not.toBeInTheDocument();
  });

  // TC-007 - behavior
  it("should hide the (disabled) marker while recording", async () => {
    const user = userEvent.setup();
    renderRow({ bindings: [], action: { id: "flip-card", name: "Flip card" } });

    expect(screen.getByText("(disabled)")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for Flip card" }),
    );

    await screen.findByText("Press keys…");
    expect(screen.queryByText("(disabled)")).not.toBeInTheDocument();
  });

  // TC-008 - behavior + side-effect-contract
  it("should show a Reset button and call store.reset when the action is overridden", async () => {
    const user = userEvent.setup();
    const { store } = renderRow({ hasOverride: true });

    const resetButton = screen.getByRole("button", {
      name: "Reset New request",
    });
    await user.click(resetButton);

    expect(store.reset).toHaveBeenCalledTimes(1);
    expect(store.reset).toHaveBeenCalledWith("new-request");
  });

  // TC-008 - behavior
  it("should not show a Reset button when the action is not overridden", () => {
    renderRow({ hasOverride: false });

    expect(
      screen.queryByRole("button", { name: "Reset New request" }),
    ).not.toBeInTheDocument();
  });

  // TC-008 - behavior
  it("should hide the Reset button while recording", async () => {
    const user = userEvent.setup();
    renderRow({ hasOverride: true });

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    );
    await screen.findByText("Press keys…");

    expect(
      screen.queryByRole("button", { name: "Reset New request" }),
    ).not.toBeInTheDocument();
  });

  // TC-009 - behavior + side-effect-contract
  it("should show a role=alert naming the conflicting action and run no mutation when a used hotkey is recorded", async () => {
    const user = userEvent.setup();
    const { store } = renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    );
    // Mod+S is owned by send-request in the effective map -> conflict.
    await user.keyboard("{Control>}s{/Control}");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Send request already uses that shortcut");
    expect(store.add).not.toHaveBeenCalled();
    expect(store.replace).not.toHaveBeenCalled();
  });

  // TC-010 - behavior
  it("should restore the edited chip and show Add when Cancel is pressed mid-edit", async () => {
    const user = userEvent.setup();
    renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", {
        name: `Edit ${formatForDisplay("Mod+N")} for New request`,
      }),
    );
    await screen.findByText("Press keys…");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      await screen.findByRole("button", {
        name: `Edit ${formatForDisplay("Mod+N")} for New request`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Press keys…")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // TC-010 - behavior: a shown conflict alert is cleared once recording is
  // re-armed and cancelled (the recorder onCancel + re-arm clear the state).
  it("should clear the conflict alert after the recording is re-armed and cancelled", async () => {
    const user = userEvent.setup();
    renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    );
    await user.keyboard("{Control>}s{/Control}");
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    );
    await screen.findByText("Press keys…");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    ).toBeInTheDocument();
  });

  // TC-011 - side-effect-contract: Escape cancels and is never assignable.
  it("should cancel recording and record nothing when Escape is pressed while adding", async () => {
    const user = userEvent.setup();
    const { store } = renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    );
    await screen.findByText("Press keys…");

    await user.keyboard("{Escape}");

    expect(store.add).not.toHaveBeenCalled();
    expect(store.replace).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
    expect(store.reset).not.toHaveBeenCalled();
    expect(screen.queryByText("Press keys…")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add shortcut for New request" }),
    ).toBeInTheDocument();
  });

  // TC-011 - behavior
  it("should restore the edited chip when Escape is pressed while editing in place", async () => {
    const user = userEvent.setup();
    const { store } = renderRow({ bindings: ["Mod+N"] });

    await user.click(
      screen.getByRole("button", {
        name: `Edit ${formatForDisplay("Mod+N")} for New request`,
      }),
    );
    await screen.findByText("Press keys…");

    await user.keyboard("{Escape}");

    expect(
      await screen.findByRole("button", {
        name: `Edit ${formatForDisplay("Mod+N")} for New request`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Press keys…")).not.toBeInTheDocument();
    expect(store.replace).not.toHaveBeenCalled();
    expect(store.add).not.toHaveBeenCalled();
  });
});
