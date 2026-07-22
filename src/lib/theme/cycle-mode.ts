import type { ThemeMode } from "@/lib/theme/effective-mode";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

// Cycle the theme mode: light -> dark -> system -> light.
export function cycleThemeMode(mode: ThemeMode): ThemeMode {
  return ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
}
