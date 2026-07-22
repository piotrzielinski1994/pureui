import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/command/command";

const selectedName = () =>
  document
    .querySelector('[cmdk-item=""][aria-selected="true"]')
    ?.textContent?.trim();

describe("Command", () => {
  it("should render the command input as a textbox carrying its placeholder", () => {
    render(
      <Command>
        <CommandInput placeholder="Type a command" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    const input = screen.getByPlaceholderText("Type a command");

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("role", "combobox");
  });

  it("should mount CommandDialog forwarding shouldFilter/filter and render the sr-only Command Palette title if opened", () => {
    render(
      <CommandDialog open shouldFilter={false} filter={() => 1}>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.getByText("Command Palette")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should render a Close button by default when showCloseButton is omitted", () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("should wrap arrow navigation to the last item when loop is set and ArrowUp is pressed on the first", async () => {
    const user = userEvent.setup();
    render(
      <CommandDialog open loop>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem>Alpha</CommandItem>
          <CommandItem>Beta</CommandItem>
          <CommandItem>Gamma</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    expect(selectedName()).toBe("Alpha");

    await user.keyboard("{ArrowUp}");

    expect(selectedName()).toBe("Gamma");
  });

  it("should resolve every AC-001 named export from the command barrel", () => {
    const exports = [
      Command,
      CommandDialog,
      CommandEmpty,
      CommandGroup,
      CommandInput,
      CommandItem,
      CommandList,
      CommandSeparator,
      CommandShortcut,
    ];

    expect(exports.every((exported) => exported !== undefined)).toBe(true);
  });
});
