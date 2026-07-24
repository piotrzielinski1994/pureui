import type { ReactNode } from "react";

import {
  type ShortcutRebindStore,
  ShortcutRow,
} from "@/components/shortcuts/shortcut-row";
import { cn } from "@/lib/utils";

export type ShortcutGroup<Id extends string> = {
  label: string;
  actions: readonly { id: Id; name: string }[];
};

export type ShortcutsSectionProps<Id extends string> = {
  actions: readonly { id: Id; name: string }[];
  effective: Record<Id, string[]>;
  overrides: Partial<Record<Id, string[]>>;
  store: ShortcutRebindStore<Id>;
  findConflict: (
    hotkey: string,
    forAction: Id,
    effective: Record<Id, string[]>,
  ) => Id | null;
  help: ReactNode;
  className?: string;
  groups?: readonly ShortcutGroup<Id>[];
};

export function ShortcutsSection<Id extends string>({
  actions,
  effective,
  overrides,
  store,
  findConflict,
  help,
  className,
  groups,
}: ShortcutsSectionProps<Id>) {
  const actionName = (id: Id): string =>
    actions.find((action) => action.id === id)?.name ?? id;

  const renderRow = (action: { id: Id; name: string }) => (
    <ShortcutRow
      key={action.id}
      action={action}
      bindings={effective[action.id]}
      effective={effective}
      hasOverride={action.id in overrides}
      store={store}
      findConflict={findConflict}
      actionName={actionName}
    />
  );

  return (
    <section className={cn("flex flex-col gap-1", className)}>
      <h2 className="text-lg font-medium">Keyboard Shortcuts</h2>
      <p className="text-sm text-muted-foreground">{help}</p>
      {groups === undefined ? (
        <div className="mt-2 divide-y">{actions.map(renderRow)}</div>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          {groups.map((group) =>
            group.actions.length === 0 ? null : (
              <div key={group.label} className="flex flex-col">
                <h3 className="text-xs font-medium uppercase text-muted-foreground">
                  {group.label}
                </h3>
                <div className="divide-y">{group.actions.map(renderRow)}</div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}
