import { describe, expect, it } from "vitest";

import { matchesAny, matchesHotkey } from "@/lib/shortcuts/match-hotkey";

const ev = (over: Partial<Parameters<typeof matchesHotkey>[0]>) => ({
  key: "",
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe("matchesHotkey", () => {
  it("should match Mod+K if metaKey is held", () => {
    expect(matchesHotkey(ev({ key: "k", metaKey: true }), "Mod+K")).toBe(true);
  });

  it("should match Mod+K if ctrlKey is held", () => {
    expect(matchesHotkey(ev({ key: "k", ctrlKey: true }), "Mod+K")).toBe(true);
  });

  it("should not match Mod+K if no modifier is held", () => {
    expect(matchesHotkey(ev({ key: "k" }), "Mod+K")).toBe(false);
  });

  it("should match Mod+Shift+N only if shift is also held", () => {
    expect(
      matchesHotkey(
        ev({ key: "n", metaKey: true, shiftKey: true }),
        "Mod+Shift+N",
      ),
    ).toBe(true);
    expect(matchesHotkey(ev({ key: "n", metaKey: true }), "Mod+Shift+N")).toBe(
      false,
    );
  });

  it("should not match Mod+N if shift is held", () => {
    expect(
      matchesHotkey(ev({ key: "n", metaKey: true, shiftKey: true }), "Mod+N"),
    ).toBe(false);
  });

  it("should match a bare Backspace only if no modifier is held", () => {
    expect(matchesHotkey(ev({ key: "Backspace" }), "Backspace")).toBe(true);
    expect(
      matchesHotkey(ev({ key: "Backspace", metaKey: true }), "Backspace"),
    ).toBe(false);
  });

  it("should match Ctrl+Tab if ctrlKey is held", () => {
    expect(matchesHotkey(ev({ key: "Tab", ctrlKey: true }), "Ctrl+Tab")).toBe(
      true,
    );
  });

  it("should not match an invalid hotkey string", () => {
    expect(matchesHotkey(ev({ key: "k", metaKey: true }), "###")).toBe(false);
  });

  it("should match Mod+Alt+= if key is the Option-composed symbol but code is Equal", () => {
    expect(
      matchesHotkey(
        ev({ key: "≠", code: "Equal", metaKey: true, altKey: true }),
        "Mod+Alt+=",
      ),
    ).toBe(true);
  });

  it("should match Mod+Alt+- if key is the Option-composed symbol but code is Minus", () => {
    expect(
      matchesHotkey(
        ev({ key: "–", code: "Minus", metaKey: true, altKey: true }),
        "Mod+Alt+-",
      ),
    ).toBe(true);
  });

  it("should match Mod+Alt+= via the literal key when no composition happened", () => {
    expect(
      matchesHotkey(
        ev({ key: "=", code: "Equal", metaKey: true, altKey: true }),
        "Mod+Alt+=",
      ),
    ).toBe(true);
  });

  it("should not match Mod+Alt+= via code if alt is not held", () => {
    expect(
      matchesHotkey(
        ev({ key: "≠", code: "Equal", metaKey: true }),
        "Mod+Alt+=",
      ),
    ).toBe(false);
  });
});

describe("matchesAny", () => {
  it("should return true if the event matches the first binding in the list", () => {
    expect(
      matchesAny(ev({ key: "j", metaKey: true }), ["Mod+J", "Mod+K"]),
    ).toBe(true);
  });

  it("should return true if the event matches a later binding in the list", () => {
    expect(
      matchesAny(ev({ key: "k", ctrlKey: true }), ["Mod+J", "Mod+K"]),
    ).toBe(true);
  });

  it("should return false if the event matches no binding in the list", () => {
    expect(
      matchesAny(ev({ key: "q", metaKey: true }), ["Mod+J", "Mod+K"]),
    ).toBe(false);
  });

  it("should return false for an empty list", () => {
    expect(matchesAny(ev({ key: "j", metaKey: true }), [])).toBe(false);
  });
});
