import { formatForDisplay } from "@tanstack/hotkeys";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/command/command";

export type PaletteCommand = {
  key: string;
  name: string;
  run: () => void;
  binding?: string;
  keywords?: string[];
  group?: string;
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly PaletteCommand[];
  groups?: readonly string[];
  loop?: boolean;
  disablePointerSelection?: boolean;
  placeholder?: string;
  emptyMessage?: string;
};

function CommandRow({
  command,
  onOpenChange,
}: {
  command: PaletteCommand;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <CommandItem
      value={command.name}
      keywords={command.keywords}
      onSelect={() => {
        command.run();
        onOpenChange(false);
      }}
    >
      <span>{command.name}</span>
      {command.binding && (
        <CommandShortcut>{formatForDisplay(command.binding)}</CommandShortcut>
      )}
    </CommandItem>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  groups,
  loop,
  disablePointerSelection,
  placeholder = "Type a command…",
  emptyMessage = "No matching commands",
}: CommandPaletteProps) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      loop={loop}
      disablePointerSelection={disablePointerSelection}
    >
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {groups
          ? groups.map((group) => {
              const groupCommands = commands.filter(
                (command) => command.group === group,
              );
              if (groupCommands.length === 0) {
                return null;
              }
              return (
                <CommandGroup key={group} heading={group}>
                  {groupCommands.map((command) => (
                    <CommandRow
                      key={command.key}
                      command={command}
                      onOpenChange={onOpenChange}
                    />
                  ))}
                </CommandGroup>
              );
            })
          : commands.map((command) => (
              <CommandRow
                key={command.key}
                command={command}
                onOpenChange={onOpenChange}
              />
            ))}
      </CommandList>
    </CommandDialog>
  );
}
