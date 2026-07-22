import { formatForDisplay } from "@tanstack/hotkeys";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  CommandPalette,
  type PaletteCommand,
} from "@/components/command-palette/command-palette";

const noop = () => {};

const buildCommand = (
  overrides: Partial<PaletteCommand> & Pick<PaletteCommand, "key" | "name">,
): PaletteCommand => ({
  run: vi.fn(),
  ...overrides,
});

const selectedName = () =>
  document
    .querySelector('[cmdk-item=""][aria-selected="true"]')
    ?.textContent?.trim();

const shortcutChips = () =>
  document.querySelectorAll('[data-slot="command-shortcut"]');

const groupHeadings = () =>
  Array.from(document.querySelectorAll('[cmdk-group-heading=""]')).map((el) =>
    el.textContent?.trim(),
  );

describe("CommandPalette", () => {
  // behavior (TC-001): a minimal flat list renders one item per command, with no
  // chips, no group headings, and no empty state.
  it("should render every command name as an item with no chips or group headings if given a minimal flat list", () => {
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        commands={[
          buildCommand({ key: "a", name: "Alpha" }),
          buildCommand({ key: "b", name: "Beta" }),
        ]}
      />,
    );

    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(shortcutChips()).toHaveLength(0);
    expect(groupHeadings()).toHaveLength(0);
    expect(screen.queryByText(/no matching commands/i)).not.toBeInTheDocument();
  });

  // side-effect-contract (TC-002): selecting a command runs it exactly once and
  // then closes the palette.
  it("should run the selected command once then call onOpenChange(false) if a command is clicked", async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    const onOpenChange = vi.fn();
    const otherRun = vi.fn();

    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        commands={[
          buildCommand({ key: "a", name: "Alpha", run: otherRun }),
          buildCommand({ key: "b", name: "Beta", run }),
        ]}
      />,
    );

    await user.click(screen.getByRole("option", { name: "Beta" }));

    expect(run).toHaveBeenCalledTimes(1);
    expect(otherRun).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // behavior (TC-003 / AC-003a): a shortcut chip renders only for a command whose
  // binding is non-empty, formatted via formatForDisplay.
  it("should render a formatted shortcut chip only for a command with a non-empty binding", () => {
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        commands={[
          buildCommand({ key: "a", name: "Save", binding: "Mod+Shift+S" }),
          buildCommand({ key: "b", name: "Reload", binding: "" }),
        ]}
      />,
    );

    const saveRow = screen.getByRole("option", { name: /save/i });
    expect(
      within(saveRow).getByText(formatForDisplay("Mod+Shift+S")),
    ).toBeInTheDocument();

    const reloadRow = screen.getByRole("option", { name: /reload/i });
    expect(
      reloadRow.querySelector('[data-slot="command-shortcut"]'),
    ).toBeNull();
    expect(shortcutChips()).toHaveLength(1);
  });

  // behavior (TC-004 / AC-003b): a command's keywords feed cmdk search, so typing
  // a keyword keeps a non-name-matching command visible.
  it("should keep a command visible if a typed query matches its keywords but not its name", async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        commands={[
          buildCommand({
            key: "a",
            name: "Toggle sidebar",
            keywords: ["panel"],
          }),
          buildCommand({ key: "b", name: "Run query" }),
        ]}
      />,
    );

    await user.type(screen.getByPlaceholderText(/type a command/i), "panel");

    expect(
      screen.getByRole("option", { name: /toggle sidebar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /run query/i }),
    ).not.toBeInTheDocument();
  });

  // behavior (TC-005 / AC-003c): with a groups order, items render under their
  // group headings in that exact order.
  it("should render grouped items under their headings in the supplied group order", () => {
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        groups={["Create", "Tabs", "View"]}
        commands={[
          buildCommand({ key: "v", name: "Toggle sidebar", group: "View" }),
          buildCommand({ key: "c", name: "New file", group: "Create" }),
          buildCommand({ key: "t", name: "Close tab", group: "Tabs" }),
        ]}
      />,
    );

    expect(groupHeadings()).toEqual(["Create", "Tabs", "View"]);

    const viewGroup = screen
      .getByText("View")
      .closest("[cmdk-group]") as HTMLElement;
    expect(viewGroup).not.toBeNull();
    expect(within(viewGroup).getByText("Toggle sidebar")).toBeInTheDocument();
  });

  // behavior (TC-005 / AC-003c): a group in the order that has no commands renders
  // no heading.
  it("should not render a heading for a group that has zero commands", () => {
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        groups={["Create", "Tabs", "View"]}
        commands={[
          buildCommand({ key: "c", name: "New file", group: "Create" }),
          buildCommand({ key: "v", name: "Toggle sidebar", group: "View" }),
        ]}
      />,
    );

    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.queryByText("Tabs")).not.toBeInTheDocument();
  });

  // behavior (TC-006 / AC-004): the loop flag reaches the underlying CommandDialog,
  // so ArrowUp on the first item wraps to the last.
  it("should wrap selection to the last item on ArrowUp from the first if loop is set", async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        loop
        onOpenChange={noop}
        commands={[
          buildCommand({ key: "a", name: "Alpha" }),
          buildCommand({ key: "b", name: "Beta" }),
          buildCommand({ key: "g", name: "Gamma" }),
        ]}
      />,
    );

    expect(selectedName()).toBe("Alpha");

    await user.keyboard("{ArrowUp}");

    expect(selectedName()).toBe("Gamma");
  });

  // behavior (TC-006 / AC-004): the disablePointerSelection flag reaches the
  // underlying CommandDialog, so hovering an item does not move the selection.
  it("should keep the selection unchanged when an item is hovered if disablePointerSelection is set", async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        disablePointerSelection
        onOpenChange={noop}
        commands={[
          buildCommand({ key: "a", name: "Alpha" }),
          buildCommand({ key: "b", name: "Beta" }),
          buildCommand({ key: "g", name: "Gamma" }),
        ]}
      />,
    );

    expect(selectedName()).toBe("Alpha");

    await user.hover(screen.getByRole("option", { name: "Gamma" }));

    expect(selectedName()).toBe("Alpha");
  });

  // behavior (TC-007 / AC-006): a query matching nothing shows the empty state and
  // no items.
  it("should show the empty message and no items if the typed query matches no command", async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        commands={[
          buildCommand({ key: "a", name: "Alpha" }),
          buildCommand({ key: "b", name: "Beta" }),
        ]}
      />,
    );

    await user.type(
      screen.getByPlaceholderText(/type a command/i),
      "zzzznomatch",
    );

    expect(screen.getByText("No matching commands")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  // behavior (AC-006): the input placeholder defaults to the shared "Type a command…" copy.
  it('should use the default placeholder "Type a command…" if none is supplied', () => {
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        commands={[buildCommand({ key: "a", name: "Alpha" })]}
      />,
    );

    expect(screen.getByPlaceholderText("Type a command…")).toBeInTheDocument();
  });

  // behavior (AC-006): a custom placeholder overrides the default.
  it("should use a custom placeholder if the placeholder prop is supplied", () => {
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        placeholder="Search actions"
        commands={[buildCommand({ key: "a", name: "Alpha" })]}
      />,
    );

    expect(screen.getByPlaceholderText("Search actions")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Type a command…"),
    ).not.toBeInTheDocument();
  });

  // behavior (AC-006): the empty state defaults to the shared "No matching commands" copy.
  it('should use the default empty message "No matching commands" if none is supplied', async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        commands={[buildCommand({ key: "a", name: "Alpha" })]}
      />,
    );

    await user.type(screen.getByPlaceholderText(/type a command/i), "zzz");

    expect(screen.getByText("No matching commands")).toBeInTheDocument();
  });

  // behavior (AC-006): a custom empty message overrides the default.
  it("should use a custom empty message if the emptyMessage prop is supplied", async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onOpenChange={noop}
        emptyMessage="Nothing here"
        commands={[buildCommand({ key: "a", name: "Alpha" })]}
      />,
    );

    await user.type(screen.getByPlaceholderText(/type a command/i), "zzz");

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByText("No matching commands")).not.toBeInTheDocument();
  });
});
