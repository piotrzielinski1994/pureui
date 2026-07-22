import { describe, expect, it } from "vitest";
import { cycleThemeMode } from "@/lib/theme/cycle-mode";

// Theme-toggle command: cycles light -> dark -> system -> light. Ported from
// the per-app cycle-mode tests being retired into pureui (AC-008).
describe("cycleThemeMode", () => {
  // AC-001, AC-008, TC-010 - behavior
  it("should advance light to dark", () => {
    expect(cycleThemeMode("light")).toBe("dark");
  });

  // AC-001, AC-008, TC-010 - behavior
  it("should advance dark to system", () => {
    expect(cycleThemeMode("dark")).toBe("system");
  });

  // AC-001, AC-008, TC-010 - behavior
  it("should wrap system back to light", () => {
    expect(cycleThemeMode("system")).toBe("light");
  });
});
