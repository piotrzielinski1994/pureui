import {
  HotkeysProvider,
  type UseHotkeyOptions,
} from "@tanstack/react-hotkeys";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { useActionHotkeys } from "@/lib/shortcuts/use-action-hotkeys";

// The pureui hook takes the RESOLVED effective map as an ARGUMENT: it does NOT
// read settings, has no SettingsProvider, no resolveShortcuts and no registry.
// So every test builds a SYNTHETIC effective map inline + mounts a real
// HotkeysProvider (the system under test is never mocked).
//
// jsdom reports a non-mac platform, so the library resolves Mod -> Control
// (pureui learnings + the app hook tests). We fire Control+J to trigger a
// "Mod+J" binding, Control+K for "Mod+K", Control+W for "Mod+W".

type ActionId = "save" | "close" | "toggle";
type Effective = Record<ActionId, string[]>;
type Handlers = Partial<Record<ActionId, () => void>>;

function Harness({
  handlers,
  effective,
  options,
}: {
  handlers: Handlers;
  effective: Effective;
  options?: UseHotkeyOptions;
}) {
  useActionHotkeys(handlers, effective, options);
  return (
    <div>
      <span data-testid="ready">ready</span>
      <input data-testid="text-input" aria-label="field" />
    </div>
  );
}

function renderHarness(
  handlers: Handlers,
  effective: Effective,
  options?: UseHotkeyOptions,
) {
  return render(
    <HotkeysProvider>
      <Harness handlers={handlers} effective={effective} options={options} />
    </HotkeysProvider>,
  );
}

describe("useActionHotkeys", () => {
  // AC-004 / TC-004 - behavior
  it("should call the handler once if the action's bound hotkey is pressed", async () => {
    const user = userEvent.setup();
    const save = vi.fn();

    renderHarness({ save }, { save: ["Mod+J"], close: [], toggle: [] });
    await screen.findByTestId("ready");

    await user.keyboard("{Control>}j{/Control}");

    expect(save).toHaveBeenCalledTimes(1);
  });

  // AC-004, AC-006 / TC-005 - behavior: binds the PASSED effective map, so an
  // overridden binding fires and the (no-longer-bound) key does not.
  it("should fire on the overridden binding if the effective map is overridden", async () => {
    const user = userEvent.setup();
    const save = vi.fn();

    renderHarness({ save }, { save: ["Mod+K"], close: [], toggle: [] });
    await screen.findByTestId("ready");

    await user.keyboard("{Control>}j{/Control}");
    expect(save).not.toHaveBeenCalled();

    await user.keyboard("{Control>}k{/Control}");
    expect(save).toHaveBeenCalledTimes(1);
  });

  // AC-004 / TC-006 - behavior: one definition per bound hotkey.
  it("should call the handler on each bound hotkey if the action has several", async () => {
    const user = userEvent.setup();
    const save = vi.fn();

    renderHarness(
      { save },
      { save: ["Mod+J", "Mod+K"], close: [], toggle: [] },
    );
    await screen.findByTestId("ready");

    await user.keyboard("{Control>}j{/Control}");
    await user.keyboard("{Control>}k{/Control}");

    expect(save).toHaveBeenCalledTimes(2);
  });

  // AC-004 / TC-007 - behavior: an empty effective list contributes no
  // definitions, so the former key never fires.
  it("should never fire if the action's effective list is empty", async () => {
    const user = userEvent.setup();
    const save = vi.fn();

    renderHarness({ save }, { save: [], close: [], toggle: [] });
    await screen.findByTestId("ready");

    await user.keyboard("{Control>}j{/Control}");

    expect(save).not.toHaveBeenCalled();
  });

  // AC-004 / TC-008 - behavior: an id whose handler is omitted is never
  // registered, and a supplied guarded no-op handler resolves without throwing.
  it("should not register an unsupplied id and should resolve a guarded no-op handler without throwing", async () => {
    const user = userEvent.setup();
    // save is a guarded no-op (nothing to act on -> returns undefined).
    const save = vi.fn(() => undefined);

    // close is bound to Mod+W in the effective map but has NO supplied handler.
    renderHarness({ save }, { save: ["Mod+J"], close: ["Mod+W"], toggle: [] });
    await screen.findByTestId("ready");

    // close (Mod+W) is not registered -> nothing fires, no error.
    await expect(user.keyboard("{Control>}w{/Control}")).resolves.not.toThrow();
    expect(save).not.toHaveBeenCalled();

    // the supplied guarded no-op resolves without throwing when its key fires.
    await expect(user.keyboard("{Control>}j{/Control}")).resolves.not.toThrow();
    expect(save).toHaveBeenCalledTimes(1);
  });

  // AC-005 / TC-009 - behavior: pureplayer's { ignoreInputs: true } suppresses a
  // bare-key binding while focus is in a text input.
  it("should not fire a bare-key binding while typing if ignoreInputs is passed", async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();

    renderHarness(
      { toggle },
      { save: [], close: [], toggle: ["p"] },
      { ignoreInputs: true },
    );
    await screen.findByTestId("ready");

    await user.click(screen.getByTestId("text-input"));
    await user.keyboard("p");

    expect(toggle).not.toHaveBeenCalled();
  });

  // AC-005 / TC-009 - behavior: purerequest's no-options policy lets a Mod-combo
  // binding fire even with focus in a text input.
  it("should fire a Mod-combo binding while typing if no options are passed", async () => {
    const user = userEvent.setup();
    const save = vi.fn();

    renderHarness({ save }, { save: ["Mod+J"], close: [], toggle: [] });
    await screen.findByTestId("ready");

    await user.click(screen.getByTestId("text-input"));
    await user.keyboard("{Control>}j{/Control}");

    expect(save).toHaveBeenCalledTimes(1);
  });

  // AC-005, AC-006 / TC-010 - side-effect contract: puredeck's { preventDefault:
  // true } prevents the matched key event's default action.
  it("should prevent the key event's default if preventDefault is passed", async () => {
    const save = vi.fn();

    renderHarness(
      { save },
      { save: ["Mod+J"], close: [], toggle: [] },
      { preventDefault: true },
    );
    await screen.findByTestId("ready");

    const event = new KeyboardEvent("keydown", {
      key: "j",
      code: "KeyJ",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  // AC-005 - behavior: the options are genuinely FORWARDED to useHotkeys. This
  // uses a NON-default value ({ ignoreInputs: false }): the library default for a
  // bare single key is ignoreInputs=true (suppressed while typing), so a bare key
  // that DOES fire while focus is in an input can only happen if the passed option
  // reached useHotkeys. Dropping the options arg would leave the default and this
  // would fail - so it guards the forwarding, unlike the default-valued cases.
  it("should fire a bare-key binding while typing if ignoreInputs is explicitly false", async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();

    renderHarness(
      { toggle },
      { save: [], close: [], toggle: ["p"] },
      { ignoreInputs: false },
    );
    await screen.findByTestId("ready");

    await user.click(screen.getByTestId("text-input"));
    await user.keyboard("p");

    expect(toggle).toHaveBeenCalledTimes(1);
  });

  // AC-005 - behavior: forwarding guard via a NON-default value ({ preventDefault:
  // false }). The library default is preventDefault=true, so an event whose default
  // is NOT prevented on a match can only happen if the passed option reached
  // useHotkeys. Dropping the options arg would prevent the default and fail this.
  it("should NOT prevent the key event's default if preventDefault is explicitly false", async () => {
    const save = vi.fn();

    renderHarness(
      { save },
      { save: ["Mod+J"], close: [], toggle: [] },
      { preventDefault: false },
    );
    await screen.findByTestId("ready");

    const event = new KeyboardEvent("keydown", {
      key: "j",
      code: "KeyJ",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  // AC-005 - behavior: purerequest's NO-options policy leaves a bare single key
  // suppressed while typing (the library per-hotkey default ignoreInputs=true).
  // Pins the assertion migrated from purerequest's deleted local hook test.
  it("should not fire a bare-key binding while typing if no options are passed", async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();

    renderHarness({ toggle }, { save: [], close: [], toggle: ["p"] });
    await screen.findByTestId("ready");

    await user.click(screen.getByTestId("text-input"));
    await user.keyboard("p");

    expect(toggle).not.toHaveBeenCalled();
  });
});
