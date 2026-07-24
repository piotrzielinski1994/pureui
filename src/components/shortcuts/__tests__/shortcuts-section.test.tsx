import { formatForDisplay } from "@tanstack/hotkeys";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ShortcutsSection } from "@/components/shortcuts/shortcuts-section";

// R6b - ShortcutsSection superset behavior (TC-012..TC-014). The section is the
// SUT; only the injected store/findConflict are synthetic. NO app registry is
// imported: a small local {id,name} action list + synthetic effective map +
// caller-supplied `help`/`className`/`groups` stand in for each app's wiring.

type ActionId =
  | "open-command-palette"
  | "toggle-sidebar"
  | "flip-card"
  | "next-tab"
  | "close-tab"
  | "refresh-table";

const ACTIONS: readonly { id: ActionId; name: string }[] = [
  { id: "open-command-palette", name: "Open command palette" },
  { id: "toggle-sidebar", name: "Toggle sidebar" },
  { id: "flip-card", name: "Flip card" },
];

const EFFECTIVE: Record<ActionId, string[]> = {
  "open-command-palette": ["Mod+K"],
  "toggle-sidebar": ["Mod+B", "Mod+G"],
  "flip-card": [],
  "next-tab": ["Mod+]"],
  "close-tab": ["Mod+W"],
  "refresh-table": ["Mod+R"],
};

function findConflict(): ActionId | null {
  return null;
}

function makeStore() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    replace: vi.fn(),
    reset: vi.fn(),
  };
}

const FLAT_HELP = (
  <p>
    Press Add and type a combination to bind it; an action can have several.
  </p>
);

describe("ShortcutsSection (flat)", () => {
  // TC-012 - behavior
  it("should render the Keyboard Shortcuts heading and the caller-supplied help when groups are absent", () => {
    render(
      <HotkeysProvider>
        <ShortcutsSection
          actions={ACTIONS}
          effective={EFFECTIVE}
          overrides={{}}
          store={makeStore()}
          findConflict={findConflict}
          help={FLAT_HELP}
        />
      </HotkeysProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Keyboard Shortcuts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Press Add and type a combination to bind it; an action can have several.",
      ),
    ).toBeInTheDocument();
  });

  // TC-012 - behavior: one row per action, flat (no scope sub-headings).
  it("should render one row per action in a single flat list when groups are absent", () => {
    render(
      <HotkeysProvider>
        <ShortcutsSection
          actions={ACTIONS}
          effective={EFFECTIVE}
          overrides={{}}
          store={makeStore()}
          findConflict={findConflict}
          help={FLAT_HELP}
        />
      </HotkeysProvider>,
    );

    // Every action's name and its own Add control render (one row each).
    for (const action of ACTIONS) {
      expect(screen.getByText(action.name)).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: `Add shortcut for ${action.name}`,
        }),
      ).toBeInTheDocument();
    }
    // Bound actions show their binding chip; the empty one shows (disabled).
    expect(screen.getByText(formatForDisplay("Mod+K"))).toBeInTheDocument();
    expect(screen.getByText("(disabled)")).toBeInTheDocument();
    // No scope sub-group headings in the flat layout.
    expect(
      screen.queryByRole("heading", { name: /^Global$/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ShortcutsSection (scope-grouped)", () => {
  const GROUPS: readonly {
    label: string;
    actions: readonly { id: ActionId; name: string }[];
  }[] = [
    {
      label: "Global",
      actions: [
        { id: "open-command-palette", name: "Open command palette" },
        { id: "toggle-sidebar", name: "Toggle sidebar" },
      ],
    },
    {
      label: "Tabs",
      actions: [
        { id: "next-tab", name: "Next tab" },
        { id: "close-tab", name: "Close tab" },
      ],
    },
    {
      label: "Data grid",
      actions: [{ id: "refresh-table", name: "Refresh table" }],
    },
    // An intentionally EMPTY group that must render nothing.
    { label: "Query editor", actions: [] },
  ];

  const ALL_GROUPED: readonly { id: ActionId; name: string }[] = GROUPS.flatMap(
    (g) => g.actions,
  );

  const SHORT_HELP = <p>Press Edit and type a new combination.</p>;

  function renderGrouped() {
    return render(
      <HotkeysProvider>
        <ShortcutsSection
          actions={ALL_GROUPED}
          effective={EFFECTIVE}
          overrides={{}}
          store={makeStore()}
          findConflict={findConflict}
          help={SHORT_HELP}
          groups={GROUPS}
        />
      </HotkeysProvider>,
    );
  }

  // TC-013 - behavior: one labelled sub-group per NON-EMPTY group, in order.
  it("should render one labelled sub-group per non-empty group in the given order", () => {
    renderGrouped();

    for (const label of ["Global", "Tabs", "Data grid"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }

    const headings = screen
      .getAllByRole("heading")
      .map((node) => node.textContent);
    const globalIndex = headings.indexOf("Global");
    const tabsIndex = headings.indexOf("Tabs");
    const gridIndex = headings.indexOf("Data grid");
    expect(globalIndex).toBeLessThan(tabsIndex);
    expect(tabsIndex).toBeLessThan(gridIndex);
  });

  // TC-013 - behavior: the empty group renders nothing.
  it("should render nothing for an empty group", () => {
    renderGrouped();

    expect(
      screen.queryByRole("heading", { name: "Query editor" }),
    ).not.toBeInTheDocument();
  });

  // TC-013 - behavior: each group's rows are exactly its scoped actions.
  it("should place each action's row inside its own group", () => {
    renderGrouped();

    const globalHeading = screen.getByRole("heading", { name: "Global" });
    const globalGroup = globalHeading.parentElement as HTMLElement;
    expect(
      within(globalGroup).getByText("Open command palette"),
    ).toBeInTheDocument();
    expect(within(globalGroup).getByText("Toggle sidebar")).toBeInTheDocument();
    expect(within(globalGroup).queryByText("Next tab")).not.toBeInTheDocument();

    const tabsHeading = screen.getByRole("heading", { name: "Tabs" });
    const tabsGroup = tabsHeading.parentElement as HTMLElement;
    expect(within(tabsGroup).getByText("Next tab")).toBeInTheDocument();
    expect(within(tabsGroup).getByText("Close tab")).toBeInTheDocument();
    expect(
      within(tabsGroup).queryByText("Open command palette"),
    ).not.toBeInTheDocument();
  });
});

describe("ShortcutsSection (caller-controlled chrome)", () => {
  // TC-014 - behavior: the section-level className is applied.
  it("should apply the caller-supplied className to the section element", () => {
    const { container } = render(
      <HotkeysProvider>
        <ShortcutsSection
          actions={ACTIONS}
          effective={EFFECTIVE}
          overrides={{}}
          store={makeStore()}
          findConflict={findConflict}
          help={FLAT_HELP}
          className="p-6"
        />
      </HotkeysProvider>,
    );

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section).toHaveClass("p-6");
  });

  // TC-014 - behavior: each app's exact help copy is preserved verbatim.
  it("should render the caller-supplied help text verbatim", () => {
    const help = (
      <p>Press Edit and type a new combination. Escape cancels recording.</p>
    );
    render(
      <HotkeysProvider>
        <ShortcutsSection
          actions={ACTIONS}
          effective={EFFECTIVE}
          overrides={{}}
          store={makeStore()}
          findConflict={findConflict}
          help={help}
        />
      </HotkeysProvider>,
    );

    expect(
      screen.getByText(
        "Press Edit and type a new combination. Escape cancels recording.",
      ),
    ).toBeInTheDocument();
  });
});
