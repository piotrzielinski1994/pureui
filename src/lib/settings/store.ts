export type SettingsStore<TSettings> = {
  load: () => Promise<TSettings>;
  save: (settings: TSettings) => Promise<void>;
};
