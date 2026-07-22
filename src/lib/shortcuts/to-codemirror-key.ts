import { safeNormalize } from "@/lib/shortcuts/normalize";

export function toCodeMirrorKey(hotkey: string): string | null {
  if (safeNormalize(hotkey) === null) {
    return null;
  }
  const parts = hotkey.split("+");
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  const isSingleAlpha = /^[a-zA-Z]$/.test(key);
  const finalKey = isSingleAlpha ? key.toLowerCase() : key;
  return [...modifiers, finalKey].join("-");
}
