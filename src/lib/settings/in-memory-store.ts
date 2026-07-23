import type { SettingsStore } from "@/lib/settings/store";

export function createInMemorySettingsStore<TSettings>(
  initial: TSettings,
): SettingsStore<TSettings> {
  let current = initial;
  return {
    load: () => Promise.resolve(current),
    save: (settings) => {
      current = settings;
      return Promise.resolve();
    },
  };
}
