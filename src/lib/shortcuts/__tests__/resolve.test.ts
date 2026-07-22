import { describe, expect, it } from "vitest";

import {
  findConflict,
  resolveShortcuts,
  type ShortcutActionMeta,
} from "@/lib/shortcuts/resolve";

type ScopedId =
  | "toggle-console"
  | "toggle-sidebar"
  | "delete-rows"
  | "delete-nodes";

const SCOPED_ACTIONS = [
  { id: "toggle-console", defaultHotkey: "Mod+J", scope: "global" },
  { id: "toggle-sidebar", defaultHotkey: "Mod+B", scope: "global" },
  { id: "delete-rows", defaultHotkey: "Backspace", scope: "grid" },
  { id: "delete-nodes", defaultHotkey: "Backspace", scope: "tree" },
] as const satisfies readonly (ShortcutActionMeta & { id: ScopedId })[];

type FlatId = "toggle-console" | "toggle-sidebar" | "close-request";

const FLAT_ACTIONS = [
  { id: "toggle-console", defaultHotkey: "Mod+J" },
  { id: "toggle-sidebar", defaultHotkey: "Mod+B" },
  { id: "close-request", defaultHotkey: "Mod+W" },
] as const satisfies readonly (ShortcutActionMeta & { id: FlatId })[];

describe("resolveShortcuts", () => {
  it("should resolve every action to a single-element list of its default if no overrides are given", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {});

    FLAT_ACTIONS.forEach((action) => {
      expect(effective[action.id]).toEqual([action.defaultHotkey]);
    });
  });

  it("should resolve a multi-binding override to every normalized hotkey", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {
      "toggle-console": ["Mod+J", "Mod+K"],
    });

    expect(effective["toggle-console"]).toEqual(["Mod+J", "Mod+K"]);
  });

  it("should normalize each entry in a multi-binding override", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {
      "toggle-console": ["mod+j", "mod+k"],
    });

    expect(effective["toggle-console"]).toEqual(["Mod+J", "Mod+K"]);
  });

  it("should resolve an empty-array override to an empty list (disabled)", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, { "toggle-console": [] });

    expect(effective["toggle-console"]).toEqual([]);
  });

  it("should drop invalid individual entries and keep the valid ones", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {
      "toggle-console": ["Mod+J", "bogus!!"],
    });

    expect(effective["toggle-console"]).toEqual(["Mod+J"]);
  });

  it("should fall back to the default list if an override value is not an array", () => {
    const overrides = {
      "toggle-console": "Mod+J",
    } as unknown as Partial<Record<FlatId, string[]>>;

    const effective = resolveShortcuts(FLAT_ACTIONS, overrides);

    expect(effective["toggle-console"]).toEqual(["Mod+J"]);
  });

  it("should fall back to the default list if an override value is a number", () => {
    const overrides = {
      "toggle-sidebar": 42,
    } as unknown as Partial<Record<FlatId, string[]>>;

    const effective = resolveShortcuts(FLAT_ACTIONS, overrides);

    expect(effective["toggle-sidebar"]).toEqual(["Mod+B"]);
  });

  it("should resolve to an empty list if every entry in the override is invalid", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {
      "toggle-console": ["bogus!!", "also bad!!"],
    });

    expect(effective["toggle-console"]).toEqual([]);
  });

  it("should ignore an override for an unknown action id and keep all defaults", () => {
    const overrides = {
      bogus: ["Mod+Q"],
    } as unknown as Partial<Record<FlatId, string[]>>;

    const effective = resolveShortcuts(FLAT_ACTIONS, overrides);

    expect(effective).not.toHaveProperty("bogus");
    FLAT_ACTIONS.forEach((action) => {
      expect(effective[action.id]).toEqual([action.defaultHotkey]);
    });
  });

  it("should not throw on a corrupt overrides map", () => {
    const overrides = {
      "toggle-sidebar": 42,
      bogus: ["Mod+Q"],
    } as unknown as Partial<Record<FlatId, string[]>>;

    expect(() => resolveShortcuts(FLAT_ACTIONS, overrides)).not.toThrow();
  });
});

describe("findConflict (scope-less actions)", () => {
  it("should report any same-key binding as a conflict when actions carry no scope", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {});

    const owner = findConflict(
      FLAT_ACTIONS,
      "Mod+B",
      "toggle-console",
      effective,
    );

    expect(owner).toBe("toggle-sidebar");
  });

  it("should exclude the edited action from its own conflict search", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {
      "toggle-console": ["Mod+J", "Mod+Shift+Q"],
    });

    expect(
      findConflict(FLAT_ACTIONS, "Mod+Shift+Q", "toggle-console", effective),
    ).toBeNull();
  });

  it("should not report a disabled action as a conflict owner", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, { "toggle-sidebar": [] });

    const owner = findConflict(
      FLAT_ACTIONS,
      "Mod+B",
      "toggle-console",
      effective,
    );

    expect(owner).toBeNull();
  });

  it("should match on normalized equality if the candidate differs only in casing", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {});

    const owner = findConflict(
      FLAT_ACTIONS,
      "mod+b",
      "toggle-console",
      effective,
    );

    expect(owner).toBe("toggle-sidebar");
  });

  it("should return null if the candidate hotkey is invalid", () => {
    const effective = resolveShortcuts(FLAT_ACTIONS, {});

    const owner = findConflict(
      FLAT_ACTIONS,
      "NotAKey++",
      "toggle-console",
      effective,
    );

    expect(owner).toBeNull();
  });
});

describe("findConflict (scoped actions)", () => {
  it("should return null if the same combo is owned by an action in a different scope", () => {
    const effective = resolveShortcuts(SCOPED_ACTIONS, {});

    const owner = findConflict(
      SCOPED_ACTIONS,
      "Backspace",
      "delete-rows",
      effective,
    );

    expect(owner).toBeNull();
  });

  it("should return the owner if the same combo is owned by an action in the same scope", () => {
    const effective = resolveShortcuts(SCOPED_ACTIONS, {});

    const owner = findConflict(
      SCOPED_ACTIONS,
      "Mod+B",
      "toggle-console",
      effective,
    );

    expect(owner).toBe("toggle-sidebar");
  });

  it("should detect a conflict from any binding in another same-scope action's multi-binding list", () => {
    const effective = resolveShortcuts(SCOPED_ACTIONS, {
      "toggle-sidebar": ["Mod+B", "Mod+Shift+Q"],
    });

    const owner = findConflict(
      SCOPED_ACTIONS,
      "mod+shift+q",
      "toggle-console",
      effective,
    );

    expect(owner).toBe("toggle-sidebar");
  });
});
