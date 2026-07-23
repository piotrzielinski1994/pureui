// A per-mode two-section color set, generic over the app's token-name types: the
// app supplies its own AppToken / EditorToken unions and their name arrays, so
// pureui carries no fixed catalog. `tokens` are the shadcn-style app CSS vars;
// `editor` are the CodeMirror syntax hues.
export type ThemeTokenSection<
  AppToken extends string,
  EditorToken extends string,
> = {
  tokens: Partial<Record<AppToken, string>>;
  editor: Partial<Record<EditorToken, string>>;
};

export type TwoSectionColors<
  AppToken extends string,
  EditorToken extends string,
> = {
  light: ThemeTokenSection<AppToken, EditorToken>;
  dark: ThemeTokenSection<AppToken, EditorToken>;
};

// Whitespace-insensitive compare so a re-formatted-but-equal oklch string is
// treated as equal (and therefore dropped from the diff = a per-token reset).
function sameColor(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

function mergeSection<AppToken extends string, EditorToken extends string>(
  overrides: ThemeTokenSection<AppToken, EditorToken>,
  defaults: ThemeTokenSection<AppToken, EditorToken>,
): ThemeTokenSection<AppToken, EditorToken> {
  return {
    tokens: { ...defaults.tokens, ...overrides.tokens },
    editor: { ...defaults.editor, ...overrides.editor },
  };
}

// The full effective set: every default token, with the sparse overrides layered
// on top. Used to seed the editor and to apply to the DOM. The two modes are
// independent - overriding one never changes the other.
export function applyDefaults<
  AppToken extends string,
  EditorToken extends string,
>(
  overrides: TwoSectionColors<AppToken, EditorToken>,
  defaults: TwoSectionColors<AppToken, EditorToken>,
): TwoSectionColors<AppToken, EditorToken> {
  return {
    light: mergeSection(overrides.light, defaults.light),
    dark: mergeSection(overrides.dark, defaults.dark),
  };
}

// Keep only the entries that (a) are in the known-token set the app passed in and
// (b) differ from the built-in default; drop everything else. The `known` guard
// is why the machinery is generic over a token-name set: a stale/unknown key from
// an older persisted store never survives the diff.
function diffMap<K extends string>(
  edited: Partial<Record<K, string>>,
  defaults: Partial<Record<K, string>>,
  known: Set<string>,
): Partial<Record<K, string>> {
  return Object.fromEntries(
    Object.entries(edited).filter(
      (entry): entry is [K, string] =>
        known.has(entry[0]) &&
        typeof entry[1] === "string" &&
        !sameColor(entry[1], defaults[entry[0] as K]),
    ),
  ) as Partial<Record<K, string>>;
}

// The sparse diff: only entries differing from the built-in default survive, so
// an un-customized token tracks the default and a token edited back to default
// drops out. `appTokens`/`editorTokens` supply the known-token guard sets.
export function diffOverrides<
  AppToken extends string,
  EditorToken extends string,
>(
  edited: TwoSectionColors<AppToken, EditorToken>,
  defaults: TwoSectionColors<AppToken, EditorToken>,
  appTokens: readonly AppToken[],
  editorTokens: readonly EditorToken[],
): TwoSectionColors<AppToken, EditorToken> {
  const appTokenSet = new Set<string>(appTokens);
  const editorTokenSet = new Set<string>(editorTokens);
  const diffSection = (
    section: ThemeTokenSection<AppToken, EditorToken>,
    sectionDefaults: ThemeTokenSection<AppToken, EditorToken>,
  ): ThemeTokenSection<AppToken, EditorToken> => ({
    tokens: diffMap<AppToken>(
      section.tokens,
      sectionDefaults.tokens,
      appTokenSet,
    ),
    editor: diffMap<EditorToken>(
      section.editor,
      sectionDefaults.editor,
      editorTokenSet,
    ),
  });
  return {
    light: diffSection(edited.light, defaults.light),
    dark: diffSection(edited.dark, defaults.dark),
  };
}
