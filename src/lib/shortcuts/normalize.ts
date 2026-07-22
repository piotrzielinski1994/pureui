import { normalizeHotkey, validateHotkey } from "@tanstack/hotkeys";

const ALLOWED_UNKNOWN_KEYS = new Set(["ContextMenu"]);

export function safeNormalize(hotkey: string): string | null {
  if (typeof hotkey !== "string" || hotkey.length === 0) {
    return null;
  }
  const result = validateHotkey(hotkey);
  const hasUnknownKey = result.warnings.some(
    (warning) =>
      warning.includes("Unknown key") &&
      !ALLOWED_UNKNOWN_KEYS.has(hotkey.split("+").pop() ?? ""),
  );
  if (!result.valid || hasUnknownKey) {
    return null;
  }
  return normalizeHotkey(hotkey);
}
