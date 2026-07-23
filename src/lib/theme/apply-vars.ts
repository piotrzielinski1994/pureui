import type { EffectiveMode } from "@/lib/theme/effective-mode";

function cssVarName(token: string): string {
  return `--${token}`;
}

// Apply the active mode's app-token overrides as inline CSS vars on `el`. An
// inline var beats both the `:root` and `.dark` stylesheet rules, so only the
// overridden tokens need writing; every app-token var NOT present in `colors` is
// cleared so a stale override from a previous mode/colors doesn't linger. `mode`
// is accepted for caller symmetry (the active effective mode) but the var names
// are mode-agnostic. Editor tokens are NOT written here - they flow through the
// CodeMirror extensions instead. Generic over the app's token-name array: the
// app passes its own APP_TOKENS in, pureui carries no catalog.
export function applyThemeVars<AppToken extends string>(
  el: HTMLElement,
  _mode: EffectiveMode,
  colorsForMode: { tokens: Partial<Record<AppToken, string>> },
  appTokens: readonly AppToken[],
): void {
  for (const token of appTokens) {
    const value = colorsForMode.tokens[token];
    if (value === undefined) {
      el.style.removeProperty(cssVarName(token));
      continue;
    }
    el.style.setProperty(cssVarName(token), value);
  }
}
