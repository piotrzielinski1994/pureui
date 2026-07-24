import { formatForDisplay } from "@tanstack/hotkeys";
import { useState } from "react";

import { Button } from "@/components/button/button";
import { useRecordHotkey } from "@/lib/shortcuts/record-hotkey";

export type ShortcutRebindStore<Id extends string> = {
  add: (id: Id, hotkey: string) => void;
  remove: (id: Id, hotkey: string) => void;
  replace: (id: Id, oldHotkey: string, newHotkey: string) => void;
  reset: (id: Id) => void;
};

export type ShortcutRowProps<Id extends string> = {
  action: { id: Id; name: string };
  bindings: string[];
  effective: Record<Id, string[]>;
  hasOverride: boolean;
  store: ShortcutRebindStore<Id>;
  findConflict: (
    hotkey: string,
    forAction: Id,
    effective: Record<Id, string[]>,
  ) => Id | null;
  actionName: (id: Id) => string;
};

export function ShortcutRow<Id extends string>({
  action,
  bindings,
  effective,
  hasOverride,
  store,
  findConflict,
  actionName,
}: ShortcutRowProps<Id>) {
  const [conflictName, setConflictName] = useState<string | null>(null);
  // The binding currently being re-recorded in place, or null when the standalone
  // Add recorder is armed (or nothing is recording).
  const [editingBinding, setEditingBinding] = useState<string | null>(null);

  const recorder = useRecordHotkey({
    onRecord: (hotkey) => {
      const owner = findConflict(hotkey, action.id, effective);
      if (owner !== null) {
        setConflictName(actionName(owner));
        setEditingBinding(null);
        return;
      }
      setConflictName(null);
      if (editingBinding !== null) {
        store.replace(action.id, editingBinding, hotkey);
        setEditingBinding(null);
        return;
      }
      store.add(action.id, hotkey);
    },
    onCancel: () => {
      setConflictName(null);
      setEditingBinding(null);
    },
  });

  const startEditing = (binding: string) => {
    setConflictName(null);
    setEditingBinding(binding);
    recorder.startRecording();
  };

  const cancelRecording = () => {
    setEditingBinding(null);
    recorder.cancelRecording();
  };

  const startAdding = () => {
    setConflictName(null);
    setEditingBinding(null);
    recorder.startRecording();
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="flex-1 text-sm">{action.name}</span>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {bindings.length === 0 && !recorder.isRecording && (
          <span className="text-xs text-muted-foreground">(disabled)</span>
        )}
        {bindings.map((binding) =>
          recorder.isRecording && editingBinding === binding ? (
            <span
              key={binding}
              className="font-mono text-xs text-muted-foreground"
            >
              Press keys…
            </span>
          ) : (
            <span
              key={binding}
              className="flex items-center gap-1 border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-xs"
            >
              <button
                type="button"
                aria-label={`Edit ${formatForDisplay(binding)} for ${action.name}`}
                className="hover:text-foreground"
                onClick={() => startEditing(binding)}
              >
                {formatForDisplay(binding)}
              </button>
              <button
                type="button"
                aria-label={`Remove ${formatForDisplay(binding)} from ${action.name}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => store.remove(action.id, binding)}
              >
                ×
              </button>
            </span>
          ),
        )}
        {recorder.isRecording && editingBinding === null && (
          <span className="font-mono text-xs text-muted-foreground">
            Press keys…
          </span>
        )}
        {conflictName !== null && (
          <span role="alert" className="text-xs text-destructive">
            {`${conflictName} already uses that shortcut`}
          </span>
        )}
      </div>
      {recorder.isRecording ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancelRecording}
        >
          Cancel
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Add shortcut for ${action.name}`}
          onClick={startAdding}
        >
          Add
        </Button>
      )}
      {hasOverride && !recorder.isRecording && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Reset ${action.name}`}
          onClick={() => store.reset(action.id)}
        >
          Reset
        </Button>
      )}
    </div>
  );
}
