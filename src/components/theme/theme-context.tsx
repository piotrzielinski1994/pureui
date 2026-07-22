import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { cycleThemeMode } from "@/lib/theme/cycle-mode";
import {
  type EffectiveMode,
  resolveEffectiveMode,
  type ThemeMode,
} from "@/lib/theme/effective-mode";
import { themeToggleMessage } from "@/lib/theme/toggle-message";

export type { EffectiveMode, ThemeMode } from "@/lib/theme/effective-mode";

// The value every consumer reads through useTheme/useThemeOptional. Generic over
// the app's own ThemeColors shape (some apps key each mode by { tokens, editor },
// others by a flat token map) so pureui never imports an app's settings types.
export type ThemeContextValue<TColors> = {
  mode: ThemeMode;
  effectiveMode: EffectiveMode;
  setMode: (mode: ThemeMode) => void;
  colors: TColors;
  effectiveColors: TColors;
  setColors: (colors: TColors) => void;
};

// The app-specific color subsystem is injected here (dependency injection) - the
// provider owns the matchMedia listener, mode resolution and the `.dark` toggle,
// but delegates "what a color means" to the host app.
export type ThemeProviderProps<TColors extends Record<EffectiveMode, unknown>> =
  {
    mode: ThemeMode;
    colors: TColors;
    setMode: (mode: ThemeMode) => void;
    setColors: (colors: TColors) => void;
    // Layer the sparse app overrides over the built-in defaults - the full set.
    computeEffectiveColors: (colors: TColors) => TColors;
    // Apply the active mode's colors as inline vars on `el`.
    applyVars: (
      el: HTMLElement,
      effectiveMode: EffectiveMode,
      colorsForMode: TColors[EffectiveMode],
    ) => void;
    children: ReactNode;
  };

// One module-level context, typed as `unknown` colors; the hooks below cast to
// the caller's TColors so the escape-hatch stays contained to two functions.
const ThemeContext = createContext<ThemeContextValue<unknown> | null>(null);

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(MEDIA_QUERY).matches;
}

export function ThemeProvider<TColors extends Record<EffectiveMode, unknown>>({
  mode,
  colors,
  setMode,
  setColors,
  computeEffectiveColors,
  applyVars,
  children,
}: ThemeProviderProps<TColors>) {
  const [prefersDark, setPrefersDark] = useState(getPrefersDark);

  // Layout effect (not passive) so the OS listener is attached synchronously on
  // commit - it can't miss a preference change that fires right after mount.
  useLayoutEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia(MEDIA_QUERY);
    const onChange = (event: { matches: boolean }) =>
      setPrefersDark(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const effectiveMode = resolveEffectiveMode(mode, prefersDark);

  const effectiveColors = useMemo(
    () => computeEffectiveColors(colors),
    [computeEffectiveColors, colors],
  );

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveMode === "dark");
    // Apply only the active effective mode's SPARSE overrides as inline vars -
    // the built-in defaults already come from :root/.dark in the app's theme css.
    applyVars(document.documentElement, effectiveMode, colors[effectiveMode]);
  }, [applyVars, effectiveMode, colors]);

  const value = useMemo<ThemeContextValue<TColors>>(
    () => ({
      mode,
      effectiveMode,
      setMode,
      colors,
      effectiveColors,
      setColors,
    }),
    [mode, effectiveMode, setMode, colors, effectiveColors, setColors],
  );

  return (
    <ThemeContext.Provider value={value as ThemeContextValue<unknown>}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme<TColors = unknown>(): ThemeContextValue<TColors> {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return value as ThemeContextValue<TColors>;
}

// Returns null when rendered outside a ThemeProvider instead of throwing - lets
// subtrees mounted in isolation (CodeMirror editors reading the active colors,
// tests, any provider-less subtree) render by falling back to built-in defaults.
export function useThemeOptional<
  TColors = unknown,
>(): ThemeContextValue<TColors> | null {
  return useContext(ThemeContext) as ThemeContextValue<TColors> | null;
}

// Cycle the mode (light -> dark -> system -> light), persist via setMode, and -
// if a `notify` emitter is injected - announce the new mode. The toast library
// is NOT a pureui dependency; the host app passes its own emitter (e.g. sonner's
// `toast`). Tolerates being called outside a ThemeProvider (returns a no-op) so
// command-palette / layout tests don't have to mount the theme stack.
export function useThemeToggle(notify?: (message: string) => void): () => void {
  const theme = useThemeOptional();
  return useCallback(() => {
    if (!theme) {
      return;
    }
    const next = cycleThemeMode(theme.mode);
    theme.setMode(next);
    if (notify) {
      notify(themeToggleMessage(next, getPrefersDark()));
    }
  }, [theme, notify]);
}
