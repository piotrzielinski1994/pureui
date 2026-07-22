import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type EffectiveMode,
  type ThemeContextValue,
  type ThemeMode,
  ThemeProvider,
  useTheme,
  useThemeOptional,
  useThemeToggle,
} from "@/components/theme/theme-context";

// The generic ThemeProvider owns the matchMedia listener, mode resolution,
// the `.dark` class toggle, and the inline-var application. The app-specific
// color subsystem is injected via props (dependency injection): `mode`,
// `colors`, `setMode`, `setColors`, `computeEffectiveColors`, `applyVars`.
// pureui imports zero app code. These tests assert observable behavior only:
// the `.dark` class on documentElement, the injected `applyVars` spy calls
// (a genuine side-effect contract), and the setMode/notify spies for the
// toggle. Ported from purequery's retired theme-context test, adapted to the
// new DI prop interface. pureui's src/test/setup.ts has NO matchMedia stub, so
// we install a controllable one inline here (do NOT edit the global setup).

// --- inline matchMedia stub (ported from purequery) --------------------------
type MediaListener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener);
    },
    // legacy API some implementations call
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };

  window.matchMedia = ((query: string) => {
    void query;
    return mql;
  }) as unknown as typeof window.matchMedia;

  return {
    // Flip the OS preference and fire a `change` to all subscribers.
    setPrefersDark(matches: boolean) {
      mql.matches = matches;
      for (const listener of listeners) {
        listener({ matches });
      }
    },
  };
}

// --- test color shapes -------------------------------------------------------
// The `{ tokens, editor }` shape (PR/PQ/PD): TColors is keyed by mode, each
// mode value is a structured record.
type StructuredColors = {
  light: { tokens: Record<string, string>; editor: Record<string, string> };
  dark: { tokens: Record<string, string>; editor: Record<string, string> };
};

const STRUCTURED_COLORS: StructuredColors = {
  light: { tokens: { "--background": "#fff" }, editor: { keyword: "#111" } },
  dark: { tokens: { "--background": "#000" }, editor: { keyword: "#eee" } },
};

// The sparse flat-map shape (pureplayer): each mode value is a flat token map.
type FlatColors = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

const FLAT_COLORS: FlatColors = {
  light: { "--background": "#fafafa" },
  dark: { "--background": "#101010" },
};

// --- probes ------------------------------------------------------------------
// Reads the resolved values through context and surfaces them into the DOM
// (the project probe pattern - react-hooks lint forbids mutating an outer
// binding from inside a component).
function ThemeProbe() {
  const { mode, effectiveMode } = useTheme<StructuredColors>();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="effective-mode">{effectiveMode}</span>
    </div>
  );
}

function noopSetMode(_mode: ThemeMode): void {}
function noopSetColors(_colors: StructuredColors): void {}
const identityEffective = (colors: StructuredColors): StructuredColors =>
  colors;
const noopApplyVars = (
  _el: HTMLElement,
  _mode: EffectiveMode,
  _colorsForMode: StructuredColors[EffectiveMode],
): void => {};

function renderWithMode(mode: ThemeMode) {
  return render(
    <ThemeProvider
      mode={mode}
      colors={STRUCTURED_COLORS}
      setMode={noopSetMode}
      setColors={noopSetColors}
      computeEffectiveColors={identityEffective}
      applyVars={noopApplyVars}
    >
      <ThemeProbe />
    </ThemeProvider>,
  );
}

afterEach(() => {
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("style");
  // @ts-expect-error - clean the stub so a later suite re-stubs from scratch.
  window.matchMedia = undefined;
});

describe("ThemeProvider mode resolution", () => {
  // AC-003, TC-001 - side-effect-contract
  it("should put the dark class on the html element and resolve effectiveMode to dark when mode is system and the OS prefers dark", async () => {
    stubMatchMedia(true);

    renderWithMode("system");

    expect(await screen.findByTestId("effective-mode")).toHaveTextContent(
      "dark",
    );
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  // AC-003, TC-002 - side-effect-contract: explicit mode wins over the OS pref.
  it("should resolve effectiveMode to light and keep no dark class when mode is light while the OS prefers dark", async () => {
    stubMatchMedia(true); // OS prefers dark, but explicit light must win.
    document.documentElement.classList.add("dark"); // start dirty to prove removal

    renderWithMode("light");

    expect(await screen.findByTestId("effective-mode")).toHaveTextContent(
      "light",
    );
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  // AC-003 - side-effect-contract: explicit dark wins over an OS light pref.
  it("should put the dark class when mode is dark while the OS prefers light", async () => {
    stubMatchMedia(false);

    renderWithMode("dark");

    expect(await screen.findByTestId("effective-mode")).toHaveTextContent(
      "dark",
    );
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  // AC-003 - side-effect-contract: system follows an OS light pref.
  it("should keep no dark class when mode is system and the OS prefers light", async () => {
    stubMatchMedia(false);

    renderWithMode("system");

    expect(await screen.findByTestId("effective-mode")).toHaveTextContent(
      "light",
    );
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  // AC-003 - behavior: both chosen mode and resolved effective mode are exposed.
  it("should expose the chosen mode and the resolved effective mode via useTheme", async () => {
    stubMatchMedia(true);

    renderWithMode("system");

    expect(await screen.findByTestId("mode")).toHaveTextContent("system");
    expect(screen.getByTestId("effective-mode")).toHaveTextContent("dark");
  });

  // AC-003 (SSR/no-matchMedia guard) - side-effect-contract: falls back to light.
  it("should fall back to light under system when matchMedia is absent", async () => {
    // Deliberately do NOT stub matchMedia for this case.
    renderWithMode("system");

    expect(await screen.findByTestId("effective-mode")).toHaveTextContent(
      "light",
    );
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});

describe("ThemeProvider live OS change", () => {
  // AC-003, TC-003 - side-effect-contract: live OS flip while in system mode,
  // no remount.
  it("should flip the dark class live when the OS preference changes while in system mode", async () => {
    const media = stubMatchMedia(false);

    renderWithMode("system");

    // Starts light (OS prefers light under system).
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    // OS flips to dark - the provider must react with no remount/reload.
    act(() => {
      media.setPrefersDark(true);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(screen.getByTestId("effective-mode")).toHaveTextContent("dark");

    // And back to light again.
    act(() => {
      media.setPrefersDark(false);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});

describe("ThemeProvider applyVars side-effect", () => {
  // AC-002, AC-003, TC-004 - side-effect-contract: the injected applyVars is
  // called with (documentElement, effectiveMode, colors[effectiveMode]).
  it("should call the injected applyVars with the documentElement, effectiveMode, and the active mode colors on mount", async () => {
    stubMatchMedia(false);
    const applyVars = vi.fn();

    render(
      <ThemeProvider
        mode="dark"
        colors={STRUCTURED_COLORS}
        setMode={noopSetMode}
        setColors={noopSetColors}
        computeEffectiveColors={identityEffective}
        applyVars={applyVars}
      >
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(applyVars).toHaveBeenCalledWith(
        document.documentElement,
        "dark",
        STRUCTURED_COLORS.dark,
      );
    });
  });

  // AC-002, AC-003, TC-004 - side-effect-contract: applyVars re-runs with the
  // newly resolved mode's colors when the OS preference changes under system.
  it("should re-call applyVars with the new mode colors when the effective mode changes", async () => {
    const media = stubMatchMedia(false);
    const applyVars = vi.fn();

    render(
      <ThemeProvider
        mode="system"
        colors={STRUCTURED_COLORS}
        setMode={noopSetMode}
        setColors={noopSetColors}
        computeEffectiveColors={identityEffective}
        applyVars={applyVars}
      >
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(applyVars).toHaveBeenCalledWith(
        document.documentElement,
        "light",
        STRUCTURED_COLORS.light,
      );
    });

    act(() => {
      media.setPrefersDark(true);
    });

    await waitFor(() => {
      expect(applyVars).toHaveBeenCalledWith(
        document.documentElement,
        "dark",
        STRUCTURED_COLORS.dark,
      );
    });
  });
});

describe("ThemeProvider effectiveColors", () => {
  // AC-002, AC-003 - behavior: effectiveColors comes from the injected
  // computeEffectiveColors(colors) and is exposed on the context value.
  it("should expose effectiveColors computed by the injected computeEffectiveColors", async () => {
    stubMatchMedia(false);
    const merged: StructuredColors = {
      light: { tokens: { "--merged": "L" }, editor: {} },
      dark: { tokens: { "--merged": "D" }, editor: {} },
    };
    const computeEffectiveColors = vi.fn(
      (_colors: StructuredColors): StructuredColors => merged,
    );

    function EffectiveColorsProbe() {
      const { effectiveColors } = useTheme<StructuredColors>();
      return (
        <span data-testid="merged">
          {effectiveColors.light.tokens["--merged"]}
        </span>
      );
    }

    render(
      <ThemeProvider
        mode="light"
        colors={STRUCTURED_COLORS}
        setMode={noopSetMode}
        setColors={noopSetColors}
        computeEffectiveColors={computeEffectiveColors}
        applyVars={noopApplyVars}
      >
        <EffectiveColorsProbe />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId("merged")).toHaveTextContent("L");
    expect(computeEffectiveColors).toHaveBeenCalledWith(STRUCTURED_COLORS);
  });
});

describe("ThemeProvider generic over the color shape", () => {
  // AC-002, TC-012 - behavior: the provider runs with the pureplayer flat-map
  // shape, threading colors[effectiveMode] (a flat record) to applyVars.
  it("should run with the flat-map color shape and pass the flat mode colors to applyVars", async () => {
    stubMatchMedia(true);
    const applyVars = vi.fn();

    function FlatProbe() {
      const { effectiveMode } = useTheme<FlatColors>();
      return <span data-testid="flat-effective">{effectiveMode}</span>;
    }

    render(
      <ThemeProvider
        mode="system"
        colors={FLAT_COLORS}
        setMode={(_m: ThemeMode) => {}}
        setColors={(_c: FlatColors) => {}}
        computeEffectiveColors={(c: FlatColors): FlatColors => c}
        applyVars={(
          _el: HTMLElement,
          _mode: EffectiveMode,
          _colorsForMode: FlatColors[EffectiveMode],
        ) => applyVars(_el, _mode, _colorsForMode)}
      >
        <FlatProbe />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId("flat-effective")).toHaveTextContent(
      "dark",
    );
    await waitFor(() => {
      expect(applyVars).toHaveBeenCalledWith(
        document.documentElement,
        "dark",
        FLAT_COLORS.dark,
      );
    });
  });

  // AC-002, TC-012 - behavior: the same provider runs with the structured
  // { tokens, editor } shape, threading its structured mode colors to applyVars.
  it("should run with the structured tokens/editor color shape and pass the structured mode colors to applyVars", async () => {
    stubMatchMedia(false);
    const applyVars = vi.fn();

    render(
      <ThemeProvider
        mode="light"
        colors={STRUCTURED_COLORS}
        setMode={noopSetMode}
        setColors={noopSetColors}
        computeEffectiveColors={identityEffective}
        applyVars={(
          el: HTMLElement,
          mode: EffectiveMode,
          colorsForMode: StructuredColors[EffectiveMode],
        ) => applyVars(el, mode, colorsForMode)}
      >
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(applyVars).toHaveBeenCalledWith(
        document.documentElement,
        "light",
        STRUCTURED_COLORS.light,
      );
    });
  });
});

describe("useTheme / useThemeOptional outside a provider", () => {
  // AC-003, TC-005 - behavior: useTheme throws outside a ThemeProvider.
  it("should throw the ThemeProvider guard message when useTheme is used outside a ThemeProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ThemeProbe />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleError.mockRestore();
  });

  // AC-001, AC-003, TC-006 - behavior: useThemeOptional returns null in an
  // isolated subtree (CodeMirror-in-isolation pattern) and the subtree renders.
  it("should return null from useThemeOptional outside a ThemeProvider without throwing", () => {
    function OptionalProbe() {
      const value: ThemeContextValue<StructuredColors> | null =
        useThemeOptional<StructuredColors>();
      return (
        <span data-testid="optional">{value === null ? "null" : "set"}</span>
      );
    }

    render(<OptionalProbe />);

    expect(screen.getByTestId("optional")).toHaveTextContent("null");
  });
});

describe("useThemeToggle", () => {
  // AC-003, AC-004, TC-007 - behavior + side-effect-contract: inside a provider
  // the toggle advances light -> dark -> system -> light, calling setMode with
  // the next mode and notify with themeToggleMessage(next, prefersDark).
  it("should cycle the mode through light, dark, system, light, calling setMode and notify each step when inside a provider", async () => {
    stubMatchMedia(false); // prefersDark = false -> "Theme: System (light)"
    const user = userEvent.setup();
    const setMode = vi.fn();
    const notify = vi.fn();

    function ToggleButton() {
      const toggle = useThemeToggle(notify);
      return (
        <button type="button" onClick={toggle}>
          toggle
        </button>
      );
    }

    // A controlled harness so setMode both records the call AND advances the
    // provider's mode, exercising the full cycle across successive clicks.
    function ControlledHarness() {
      const [mode, setModeState] = useState<ThemeMode>("light");
      const handleSetMode = (next: ThemeMode) => {
        setMode(next);
        setModeState(next);
      };
      return (
        <ThemeProvider
          mode={mode}
          colors={STRUCTURED_COLORS}
          setMode={handleSetMode}
          setColors={noopSetColors}
          computeEffectiveColors={identityEffective}
          applyVars={noopApplyVars}
        >
          <ToggleButton />
        </ThemeProvider>
      );
    }

    render(<ControlledHarness />);
    const button = screen.getByRole("button", { name: "toggle" });

    await user.click(button); // light -> dark
    await user.click(button); // dark -> system
    await user.click(button); // system -> light

    expect(setMode.mock.calls).toEqual([["dark"], ["system"], ["light"]]);
    expect(notify.mock.calls).toEqual([
      ["Theme: Dark"],
      ["Theme: System (light)"],
      ["Theme: Light"],
    ]);
  });

  // AC-004, TC-014 corollary - behavior: with notify omitted the toggle still
  // cycles + calls setMode, silently (no throw).
  it("should still cycle and call setMode but stay silent when notify is omitted", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    const setMode = vi.fn();

    function ToggleButton() {
      const toggle = useThemeToggle();
      return (
        <button type="button" onClick={toggle}>
          toggle
        </button>
      );
    }

    render(
      <ThemeProvider
        mode="light"
        colors={STRUCTURED_COLORS}
        setMode={setMode}
        setColors={noopSetColors}
        computeEffectiveColors={identityEffective}
        applyVars={noopApplyVars}
      >
        <ToggleButton />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "toggle" }));

    expect(setMode).toHaveBeenCalledWith("dark");
  });

  // AC-003, TC-008 - behavior: outside a provider the returned fn is a no-op
  // (no throw, no notify) so palette/layout tests render without the theme stack.
  it("should be a no-op outside a provider, never throwing or notifying", async () => {
    const user = userEvent.setup();
    const notify = vi.fn();

    function ToggleButton() {
      const toggle = useThemeToggle(notify);
      return (
        <button type="button" onClick={toggle}>
          toggle
        </button>
      );
    }

    render(<ToggleButton />);

    await user.click(screen.getByRole("button", { name: "toggle" }));

    expect(notify).not.toHaveBeenCalled();
  });
});
