import { safeNormalize } from "@/lib/shortcuts/normalize";

export type ShortcutActionMeta = {
  id: string;
  defaultHotkey: string;
  scope?: string;
};

export function resolveShortcuts<Id extends string>(
  actions: readonly (ShortcutActionMeta & { id: Id })[],
  overrides: Partial<Record<Id, string[]>>,
): Record<Id, string[]> {
  const overlay: Partial<Record<Id, string[]>> =
    typeof overrides === "object" && overrides !== null ? overrides : {};
  return actions.reduce(
    (acc, action) => {
      const candidate = overlay[action.id];
      if (!Array.isArray(candidate)) {
        acc[action.id] = [action.defaultHotkey];
        return acc;
      }
      acc[action.id] = candidate
        .map((entry) => safeNormalize(entry))
        .filter((entry): entry is string => entry !== null);
      return acc;
    },
    {} as Record<Id, string[]>,
  );
}

export function findConflict<Id extends string>(
  actions: readonly (ShortcutActionMeta & { id: Id })[],
  hotkey: string,
  forAction: Id,
  effective: Record<Id, string[]>,
): Id | null {
  const target = safeNormalize(hotkey);
  if (target === null) {
    return null;
  }
  const scopeById = new Map<Id, string | undefined>(
    actions.map((action) => [action.id, action.scope]),
  );
  const scope = scopeById.get(forAction);
  const owner = actions
    .map((action) => action.id)
    .find((id) => {
      if (id === forAction || !scopeById.has(id)) {
        return false;
      }
      if (scopeById.get(id) !== scope) {
        return false;
      }
      return (effective[id] ?? []).some(
        (binding) => safeNormalize(binding) === target,
      );
    });
  return owner ?? null;
}
