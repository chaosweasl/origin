import { create } from 'zustand';
import { LazyStore } from '@tauri-apps/plugin-store';

const storePlugin = new LazyStore('settings.json');

interface AppState {
  theme: 'normal' | 'focus';
  setTheme: (theme: 'normal' | 'focus') => void;

  isFocusModeActive: boolean;
  setFocusModeActive: (active: boolean) => void;

  vaultPath: string | null;
  setVaultPath: (path: string) => void;

  focusWallpaperPath: string | null;
  setFocusWallpaperPath: (path: string) => void;

  focusAppsToBlock: string[];
  setFocusAppsToBlock: (apps: string[]) => void;

  focusAudioPath: string | null;
  setFocusAudioPath: (path: string) => void;

  anthropicApiKey: string | null;
  setAnthropicApiKey: (key: string) => void;

  pomodoroWorkDuration: number;
  setPomodoroWorkDuration: (duration: number) => void;

  pomodoroBreakDuration: number;
  setPomodoroBreakDuration: (duration: number) => void;

  loadStore: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'normal',
  setTheme: (theme) => set({ theme }),

  isFocusModeActive: false,
  setFocusModeActive: (active) => set({ isFocusModeActive: active }),

  vaultPath: null,
  setVaultPath: async (path) => {
    set({ vaultPath: path });
    await storePlugin.set('vaultPath', path);
    await storePlugin.save();
  },

  focusWallpaperPath: null,
  setFocusWallpaperPath: async (path) => {
    set({ focusWallpaperPath: path });
    await storePlugin.set('focusWallpaperPath', path);
    await storePlugin.save();
  },

  focusAppsToBlock: [],
  setFocusAppsToBlock: async (apps) => {
    set({ focusAppsToBlock: apps });
    await storePlugin.set('focusAppsToBlock', apps);
    await storePlugin.save();
  },

  focusAudioPath: null,
  setFocusAudioPath: async (path) => {
    set({ focusAudioPath: path });
    await storePlugin.set('focusAudioPath', path);
    await storePlugin.save();
  },

  anthropicApiKey: null,
  setAnthropicApiKey: async (key) => {
    set({ anthropicApiKey: key });
    await storePlugin.set('anthropicApiKey', key);
    await storePlugin.save();
  },

  pomodoroWorkDuration: 25,
  setPomodoroWorkDuration: async (duration) => {
    set({ pomodoroWorkDuration: duration });
    await storePlugin.set('pomodoroWorkDuration', duration);
    await storePlugin.save();
  },

  pomodoroBreakDuration: 5,
  setPomodoroBreakDuration: async (duration) => {
    set({ pomodoroBreakDuration: duration });
    await storePlugin.set('pomodoroBreakDuration', duration);
    await storePlugin.save();
  },

  loadStore: async () => {
    try {
      const v = await storePlugin.get<string>('vaultPath');
      const w = await storePlugin.get<string>('focusWallpaperPath');
      const ab = await storePlugin.get<string[]>('focusAppsToBlock');
      const au = await storePlugin.get<string>('focusAudioPath');
      const ak = await storePlugin.get<string>('anthropicApiKey');
      const pwd = await storePlugin.get<number>('pomodoroWorkDuration');
      const pbd = await storePlugin.get<number>('pomodoroBreakDuration');

      if (v) set({ vaultPath: v });
      if (w) set({ focusWallpaperPath: w });
      if (ab) set({ focusAppsToBlock: ab });
      if (au) set({ focusAudioPath: au });
      if (ak) set({ anthropicApiKey: ak });
      if (pwd) set({ pomodoroWorkDuration: pwd });
      if (pbd) set({ pomodoroBreakDuration: pbd });
    } catch (e) {
      console.error("Failed to load store", e);
    }
  }
}));
