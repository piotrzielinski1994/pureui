export type FolderPicker = {
  pick: () => Promise<string | null>;
};

export function createNoopFolderPicker(): FolderPicker {
  return {
    pick: () => Promise.resolve(null),
  };
}
