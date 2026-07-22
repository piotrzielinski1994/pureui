import { describe, expect, it } from "vitest";
import { themeToggleMessage } from "@/lib/theme/toggle-message";

// The toast text shown when the mode is cycled. System spells out the resolved
// scheme so the change is legible even when light/dark looks the same. Ported
// from the per-app toggle-message tests being retired into pureui (AC-008).
describe("themeToggleMessage", () => {
  // AC-001, AC-008, TC-011 - behavior
  it("should name the Light mode regardless of prefersDark", () => {
    expect(themeToggleMessage("light", false)).toBe("Theme: Light");
    expect(themeToggleMessage("light", true)).toBe("Theme: Light");
  });

  // AC-001, AC-008, TC-011 - behavior
  it("should name the Dark mode regardless of prefersDark", () => {
    expect(themeToggleMessage("dark", false)).toBe("Theme: Dark");
    expect(themeToggleMessage("dark", true)).toBe("Theme: Dark");
  });

  // AC-001, AC-008, TC-011 - behavior: system spells out the resolved scheme (dark).
  it("should spell out the resolved scheme for system when the OS prefers dark", () => {
    expect(themeToggleMessage("system", true)).toBe("Theme: System (dark)");
  });

  // AC-001, AC-008, TC-011 - behavior: system spells out the resolved scheme (light).
  it("should spell out the resolved scheme for system when the OS prefers light", () => {
    expect(themeToggleMessage("system", false)).toBe("Theme: System (light)");
  });
});
