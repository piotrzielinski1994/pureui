import { describe, expect, it } from "vitest";

import { toCodeMirrorKey } from "@/lib/shortcuts/to-codemirror-key";

describe("toCodeMirrorKey", () => {
  it("should convert Mod+F to the lower-cased CodeMirror key Mod-f", () => {
    expect(toCodeMirrorKey("Mod+F")).toBe("Mod-f");
  });

  it("should convert Mod+Shift+F to Mod-Shift-f", () => {
    expect(toCodeMirrorKey("Mod+Shift+F")).toBe("Mod-Shift-f");
  });

  it("should keep the named key Enter unchanged", () => {
    expect(toCodeMirrorKey("Enter")).toBe("Enter");
  });

  it("should return null if the hotkey is invalid", () => {
    expect(toCodeMirrorKey("###")).toBeNull();
  });
});
