import { describe, expect, it } from "vitest";
import { resolveEffectiveMode } from "@/lib/theme/effective-mode";

// Pure resolution of the chosen mode -> the concrete effective mode. The
// "effective mode" is what actually gets applied to the DOM (.dark or not):
// equal to the chosen mode unless the mode is "system", in which case it
// derives from prefers-color-scheme. Ported from the per-app effective-mode
// tests being retired into pureui (AC-008), retargeted at @/lib/theme.

describe("resolveEffectiveMode", () => {
  // AC-001, AC-008, TC-009 - behavior: light is always light, ignoring OS pref.
  it("should resolve light to light when prefersDark is true", () => {
    expect(resolveEffectiveMode("light", true)).toBe("light");
  });

  // AC-001, AC-008, TC-009 - behavior: light is always light, ignoring OS pref.
  it("should resolve light to light when prefersDark is false", () => {
    expect(resolveEffectiveMode("light", false)).toBe("light");
  });

  // AC-001, AC-008, TC-009 - behavior: dark is always dark, ignoring OS pref.
  it("should resolve dark to dark when prefersDark is true", () => {
    expect(resolveEffectiveMode("dark", true)).toBe("dark");
  });

  // AC-001, AC-008, TC-009 - behavior: dark is always dark, ignoring OS pref.
  it("should resolve dark to dark when prefersDark is false", () => {
    expect(resolveEffectiveMode("dark", false)).toBe("dark");
  });

  // AC-001, AC-008, TC-009 - behavior: system follows the OS when it prefers dark.
  it("should resolve system to dark when the OS prefers dark", () => {
    expect(resolveEffectiveMode("system", true)).toBe("dark");
  });

  // AC-001, AC-008, TC-009 - behavior: system follows the OS when it prefers light.
  it("should resolve system to light when the OS does not prefer dark", () => {
    expect(resolveEffectiveMode("system", false)).toBe("light");
  });
});
