import { createContext, type ReactNode, useContext } from "react";
import { fallbackAppVersion } from "@/lib/updater/app-version";
import {
  createNoopUpdateController,
  type UpdateController,
} from "@/lib/updater/update-controller";

export type UpdaterContextValue = {
  controller: UpdateController;
  getVersion: () => Promise<string>;
};

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

// With no provider mounted, consumers get a noop controller (check -> null) and
// the fallback version getter (-> "dev") so a component reading useUpdater()
// works in isolation (tests, storybook) without wiring.
const DEFAULT: UpdaterContextValue = {
  controller: createNoopUpdateController(),
  getVersion: fallbackAppVersion,
};

export function UpdaterProvider({
  controller,
  getVersion,
  children,
}: {
  controller: UpdateController;
  getVersion: () => Promise<string>;
  children: ReactNode;
}) {
  return (
    <UpdaterContext.Provider value={{ controller, getVersion }}>
      {children}
    </UpdaterContext.Provider>
  );
}

export function useUpdater(): UpdaterContextValue {
  return useContext(UpdaterContext) ?? DEFAULT;
}
