import { createContext, useContext } from "react";

export const DEFAULT_SETTINGS = {
  voice: true,
  beeps: true,
  large: false,
  contrast: false,
};

export const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  setSetting: () => {},
  say: () => {},
  cue: () => {},
  silence: () => {},
  prime: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}