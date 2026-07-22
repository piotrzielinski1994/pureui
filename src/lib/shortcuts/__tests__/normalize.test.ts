import { describe, expect, it } from "vitest";

import { safeNormalize } from "@/lib/shortcuts/normalize";

describe("safeNormalize", () => {
  it("should return a normalized string if the input is a valid hotkey", () => {
    expect(safeNormalize("Mod+J")).toBe("Mod+J");
  });

  it("should canonicalize a lower-case modifier+key into the registry form", () => {
    expect(safeNormalize("mod+j")).toBe("Mod+J");
  });

  it("should return null if the input is garbage", () => {
    expect(safeNormalize("NotAKey++")).toBeNull();
  });

  it("should return null if the input is an empty string", () => {
    expect(safeNormalize("")).toBeNull();
  });

  it("should allow the ContextMenu key despite the Unknown key warning", () => {
    expect(safeNormalize("ContextMenu")).toBe("ContextMenu");
  });

  it("should allow a modified ContextMenu binding", () => {
    expect(safeNormalize("Shift+ContextMenu")).toBe("Shift+ContextMenu");
  });
});
