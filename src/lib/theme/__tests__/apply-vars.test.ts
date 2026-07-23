import { describe, expect, it } from "vitest";
import { applyThemeVars } from "@/lib/theme/apply-vars";

// The hoisted per-mode CSS-var writer (R13 AC-003 / TC-003..TC-005). It is
// generic over the app's token-name array (the app passes its own APP_TOKENS in,
// pureui carries no catalog). For each token in `appTokens` it sets the inline
// var `--<token>` on `el.style` when present in `colorsForMode.tokens`, and
// REMOVES that var when absent (so a stale override from a previous mode/colors
// does not linger). A hyphenated token (`card-foreground`) maps to the dashed
// var (`--card-foreground`). Editor tokens are NEVER written as inline vars.
// `mode` is accepted for caller symmetry but the var names are mode-agnostic.
// We assert observable side effects via el.style.getPropertyValue on a detached
// element, never implementation internals.

type AppToken = "background" | "foreground" | "primary" | "card-foreground";
type EditorToken = "keyword" | "string";

// The app's own token-name array, passed into the generic machinery.
const APP_TOKENS: readonly AppToken[] = [
  "background",
  "foreground",
  "primary",
  "card-foreground",
];

type ColorsForMode = {
  tokens: Partial<Record<AppToken, string>>;
  editor: Partial<Record<EditorToken, string>>;
};

// Build the fuller two-section colors object the app supplies; applyThemeVars
// reads only `.tokens`, so the extra `.editor` assigns structurally.
const colors = (
  tokens: Partial<Record<AppToken, string>>,
  editor: Partial<Record<EditorToken, string>> = {},
): ColorsForMode => ({ tokens, editor });

describe("applyThemeVars", () => {
  // AC-003 / TC-003 - side-effect-contract: an overridden token sets its var.
  it("should set --primary inline if primary is overridden", () => {
    const el = document.createElement("div");

    applyThemeVars(
      el,
      "light",
      colors({ primary: "oklch(0.55 0.22 27)" }),
      APP_TOKENS,
    );

    expect(el.style.getPropertyValue("--primary").trim()).toBe(
      "oklch(0.55 0.22 27)",
    );
  });

  // AC-003 / TC-003 - side-effect-contract: a hyphenated token maps to a dashed
  // var (`card-foreground` -> `--card-foreground`), and both provided tokens are
  // written in one call.
  it("should set --card-foreground inline if the card-foreground token is overridden", () => {
    const el = document.createElement("div");

    applyThemeVars(
      el,
      "light",
      colors({
        primary: "oklch(0.55 0.22 27)",
        "card-foreground": "oklch(0.2 0 0)",
      }),
      APP_TOKENS,
    );

    expect(el.style.getPropertyValue("--primary").trim()).toBe(
      "oklch(0.55 0.22 27)",
    );
    expect(el.style.getPropertyValue("--card-foreground").trim()).toBe(
      "oklch(0.2 0 0)",
    );
  });

  // AC-003 / TC-004 - side-effect-contract: a var set on a prior call is removed
  // when the next call omits that token (stale-override clear), AND an editor
  // token is never written as an inline var (neither --keyword nor
  // --editor-keyword).
  it("should clear a stale --primary and skip editor tokens if the next colors omit primary", () => {
    const el = document.createElement("div");

    applyThemeVars(
      el,
      "light",
      colors({ primary: "oklch(0.55 0.22 27)" }),
      APP_TOKENS,
    );
    expect(el.style.getPropertyValue("--primary").trim()).toBe(
      "oklch(0.55 0.22 27)",
    );

    applyThemeVars(
      el,
      "dark",
      colors({}, { keyword: "oklch(0.5 0.18 30)" }),
      APP_TOKENS,
    );

    expect(el.style.getPropertyValue("--primary").trim()).toBe("");
    expect(el.style.getPropertyValue("--keyword").trim()).toBe("");
    expect(el.style.getPropertyValue("--editor-keyword").trim()).toBe("");
  });

  // AC-003 / TC-005 - side-effect-contract: switching the overridden token both
  // sets the new var and clears the previously-set one.
  it("should set --background and clear --primary if the next colors override only background", () => {
    const el = document.createElement("div");

    applyThemeVars(
      el,
      "light",
      colors({ primary: "oklch(0.55 0.22 27)" }),
      APP_TOKENS,
    );
    applyThemeVars(
      el,
      "light",
      colors({ background: "oklch(0.99 0 0)" }),
      APP_TOKENS,
    );

    expect(el.style.getPropertyValue("--background").trim()).toBe(
      "oklch(0.99 0 0)",
    );
    expect(el.style.getPropertyValue("--primary").trim()).toBe("");
  });

  // AC-003 - side-effect-contract: only the overridden token's var is set; the
  // other app-token vars stay clear (no stray vars leak in).
  it("should not set an inline var if the token is not overridden", () => {
    const el = document.createElement("div");

    applyThemeVars(
      el,
      "light",
      colors({ primary: "oklch(0.55 0.22 27)" }),
      APP_TOKENS,
    );

    expect(el.style.getPropertyValue("--background").trim()).toBe("");
    expect(el.style.getPropertyValue("--foreground").trim()).toBe("");
  });
});
