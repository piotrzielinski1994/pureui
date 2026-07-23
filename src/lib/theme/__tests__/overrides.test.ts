import { describe, expect, it } from "vitest";
import { applyDefaults, diffOverrides } from "@/lib/theme/overrides";

// The hoisted pure color transforms (R13 AC-004..AC-007 / TC-006..TC-011),
// generic over the app's token-name arrays:
//  - applyDefaults(overrides, defaults) -> the FULL effective set: for each of
//    light/dark, the built-in defaults with the sparse overrides layered on top,
//    for BOTH the tokens and editor sections, the two modes independent.
//  - diffOverrides(edited, defaults, appTokens, editorTokens) -> the SPARSE diff:
//    only entries whose value differs from the default survive (whitespace-
//    insensitive oklch compare, so a token edited back to default drops out);
//    any edited key NOT in the supplied token-name set is dropped (the guard).
// Round-trip: diffOverrides(applyDefaults(x, d), d, appTokens, editorTokens)
// deep-equals x. We assert observable return values (deep-equal on the sparse /
// full sets), never implementation internals.

type AppToken = "background" | "foreground" | "primary";
type EditorToken = "string" | "keyword";

// The app's own token-name arrays, passed into the generic machinery so it can
// build the known-token guard sets without carrying a catalog.
const APP_TOKENS: readonly AppToken[] = ["background", "foreground", "primary"];
const EDITOR_TOKENS: readonly EditorToken[] = ["string", "keyword"];

type Section = {
  tokens: Partial<Record<AppToken, string>>;
  editor: Partial<Record<EditorToken, string>>;
};
type Colors = { light: Section; dark: Section };

// A small self-contained defaults table (not the real catalog) so the tests pin
// the pure layering/diff behavior, not the canonical oklch values.
const DEFAULTS: Colors = {
  light: {
    tokens: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)",
    },
    editor: {
      string: "oklch(0.6 0.1 140)",
      keyword: "oklch(0.7 0.2 30)",
    },
  },
  dark: {
    tokens: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      primary: "oklch(0.922 0 0)",
    },
    editor: {
      string: "oklch(0.7 0.1 140)",
      keyword: "oklch(0.6 0.2 30)",
    },
  },
};

const emptyColors = (): Colors => ({
  light: { tokens: {}, editor: {} },
  dark: { tokens: {}, editor: {} },
});

describe("applyDefaults", () => {
  // AC-004 / TC-006 - behavior: an overridden app token and an overridden editor
  // token win in the effective set; every other token/editor entry in BOTH modes
  // equals the default.
  it("should layer sparse tokens and editor overrides over the defaults if only light entries are set", () => {
    const sparse: Colors = {
      light: {
        tokens: { primary: "oklch(0.55 0.22 27)" },
        editor: { string: "oklch(0.74 0.15 60)" },
      },
      dark: { tokens: {}, editor: {} },
    };

    const effective = applyDefaults(sparse, DEFAULTS);

    expect(effective.light.tokens.primary).toBe("oklch(0.55 0.22 27)");
    expect(effective.light.editor.string).toBe("oklch(0.74 0.15 60)");
    // Un-overridden entries fall back to the default, in both sections.
    expect(effective.light.tokens.background).toBe(
      DEFAULTS.light.tokens.background,
    );
    expect(effective.light.editor.keyword).toBe(DEFAULTS.light.editor.keyword);
    // The untouched dark mode equals the default verbatim, both sections.
    expect(effective.dark.tokens).toEqual(DEFAULTS.dark.tokens);
    expect(effective.dark.editor).toEqual(DEFAULTS.dark.editor);
  });

  // AC-004 / TC-006 - behavior: with no overrides the effective set carries every
  // default token/editor entry in both modes.
  it("should return the full default set if no overrides are present", () => {
    const effective = applyDefaults(emptyColors(), DEFAULTS);

    expect(effective.light.tokens).toEqual(DEFAULTS.light.tokens);
    expect(effective.light.editor).toEqual(DEFAULTS.light.editor);
    expect(effective.dark.tokens).toEqual(DEFAULTS.dark.tokens);
    expect(effective.dark.editor).toEqual(DEFAULTS.dark.editor);
  });

  // AC-004 / TC-007 - behavior: the two modes are independent - overriding a
  // light token never changes the dark value.
  it("should keep dark unchanged if only a light token is overridden", () => {
    const sparse: Colors = {
      light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const effective = applyDefaults(sparse, DEFAULTS);

    expect(effective.light.tokens.primary).toBe("oklch(0.55 0.22 27)");
    expect(effective.dark.tokens.primary).toBe(DEFAULTS.dark.tokens.primary);
  });
});

describe("diffOverrides", () => {
  // AC-005, AC-007 / TC-008 - behavior: from a full effective set, only the
  // entries differing from the default survive; no default-valued token leaks in.
  it("should keep exactly the differing token if the effective set overrides only light primary", () => {
    const effective = applyDefaults(
      {
        light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
        dark: { tokens: {}, editor: {} },
      },
      DEFAULTS,
    );

    const diff = diffOverrides(effective, DEFAULTS, APP_TOKENS, EDITOR_TOKENS);

    expect(diff).toEqual({
      light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    });
  });

  // AC-005 / TC-009 - behavior: a whitespace-only variant of the default value is
  // treated as equal and dropped (the per-token reset is whitespace-insensitive).
  it("should drop background if the edited value is a whitespace variant of the default", () => {
    const edited: Colors = {
      // default is "oklch(1 0 0)"; extra internal whitespace, semantically equal.
      light: { tokens: { background: "oklch(1  0   0)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const diff = diffOverrides(edited, DEFAULTS, APP_TOKENS, EDITOR_TOKENS);

    expect(diff.light.tokens.background).toBeUndefined();
    expect(diff.light.tokens).toEqual({});
  });

  // AC-005 / TC-009 - behavior: a genuinely different value is KEPT.
  it("should keep background if the edited value genuinely differs from the default", () => {
    const edited: Colors = {
      light: { tokens: { background: "oklch(0.99 0 0)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const diff = diffOverrides(edited, DEFAULTS, APP_TOKENS, EDITOR_TOKENS);

    expect(diff.light.tokens.background).toBe("oklch(0.99 0 0)");
  });

  // AC-006 / TC-010 - behavior: an edited key that is NOT in the supplied
  // APP_TOKENS set is dropped from the diff (the known-token guard), even with a
  // non-default value; known differing tokens still survive.
  it("should drop an unknown key not in APP_TOKENS while keeping known differing tokens", () => {
    const edited = {
      light: {
        tokens: {
          primary: "oklch(0.55 0.22 27)",
          "legacy-token": "oklch(0.42 0 0)",
        },
        editor: {},
      },
      dark: { tokens: {}, editor: {} },
    } as unknown as Colors;

    const diff = diffOverrides(edited, DEFAULTS, APP_TOKENS, EDITOR_TOKENS);

    expect(diff.light.tokens).toEqual({ primary: "oklch(0.55 0.22 27)" });
    expect(
      (diff.light.tokens as Record<string, string>)["legacy-token"],
    ).toBeUndefined();
  });

  // AC-006 / TC-010 - behavior: the same guard applies to the editor section - an
  // edited editor key not in EDITOR_TOKENS is dropped.
  it("should drop an unknown editor key not in EDITOR_TOKENS", () => {
    const edited = {
      light: {
        tokens: {},
        editor: {
          keyword: "oklch(0.71 0.2 30)",
          "legacy-editor": "oklch(0.42 0 0)",
        },
      },
      dark: { tokens: {}, editor: {} },
    } as unknown as Colors;

    const diff = diffOverrides(edited, DEFAULTS, APP_TOKENS, EDITOR_TOKENS);

    expect(diff.light.editor).toEqual({ keyword: "oklch(0.71 0.2 30)" });
    expect(
      (diff.light.editor as Record<string, string>)["legacy-editor"],
    ).toBeUndefined();
  });
});

describe("diffOverrides / applyDefaults round-trip", () => {
  // AC-007 / TC-011 - behavior: diff(apply(x, d), d) deep-equals x for a
  // representative sparse x spanning tokens + editor in both modes.
  it("should round-trip a representative sparse override set spanning both sections and modes", () => {
    const sparse: Colors = {
      light: {
        tokens: { primary: "oklch(0.55 0.22 27)" },
        editor: { keyword: "oklch(0.71 0.2 30)" },
      },
      dark: {
        tokens: { background: "oklch(0.12 0 0)" },
        editor: { string: "oklch(0.74 0.15 60)" },
      },
    };

    const roundTripped = diffOverrides(
      applyDefaults(sparse, DEFAULTS),
      DEFAULTS,
      APP_TOKENS,
      EDITOR_TOKENS,
    );

    expect(roundTripped).toEqual(sparse);
  });

  // AC-007 / TC-011 - behavior: an empty sparse set round-trips to empty (no
  // default leaks into the stored diff).
  it("should round-trip an empty sparse set to empty", () => {
    const roundTripped = diffOverrides(
      applyDefaults(emptyColors(), DEFAULTS),
      DEFAULTS,
      APP_TOKENS,
      EDITOR_TOKENS,
    );

    expect(roundTripped).toEqual(emptyColors());
  });
});
