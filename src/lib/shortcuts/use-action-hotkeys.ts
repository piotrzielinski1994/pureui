import type { Hotkey } from "@tanstack/hotkeys";
import {
  type UseHotkeyDefinition,
  type UseHotkeyOptions,
  useHotkeys,
} from "@tanstack/react-hotkeys";

export function useActionHotkeys<Id extends string>(
  handlers: Partial<Record<Id, () => void>>,
  effective: Record<Id, string[]>,
  options?: UseHotkeyOptions,
): void {
  // One definition per bound hotkey, so an action with several bindings fires on
  // any of them. An empty list (disabled action) contributes no definitions, and
  // an id without a supplied handler is never registered.
  const definitions: UseHotkeyDefinition[] = (
    Object.keys(handlers) as Id[]
  ).flatMap((id) =>
    effective[id].map((hotkey) => ({
      hotkey: hotkey as Hotkey,
      callback: () => {
        handlers[id]?.();
      },
    })),
  );

  // Input-suppression / preventDefault policy is caller-controlled: forwarded to
  // useHotkeys' common options so each consuming app keeps its own behavior.
  useHotkeys(definitions, options);
}
