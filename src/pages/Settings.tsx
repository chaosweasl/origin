import { useState } from "react";
import { useAppStore } from "../lib/store";

export default function Settings() {
  const store = useAppStore();

  const [vaultPath, setVaultPath] = useState(store.vaultPath || "");
  const [wallpaperPath, setWallpaperPath] = useState(store.focusWallpaperPath || "");
  const [audioPath, setAudioPath] = useState(store.focusAudioPath || "");
  const [appsToBlock, setAppsToBlock] = useState(store.focusAppsToBlock.join(", "));
  const [apiKey, setApiKey] = useState(store.anthropicApiKey || "");
  const [workDuration, setWorkDuration] = useState(store.pomodoroWorkDuration.toString());
  const [breakDuration, setBreakDuration] = useState(store.pomodoroBreakDuration.toString());

  const handleSave = () => {
    store.setVaultPath(vaultPath);
    store.setFocusWallpaperPath(wallpaperPath);
    store.setFocusAudioPath(audioPath);
    store.setFocusAppsToBlock(appsToBlock.split(",").map(s => s.trim()).filter(Boolean));
    store.setAnthropicApiKey(apiKey);
    store.setPomodoroWorkDuration(parseInt(workDuration, 10) || 25);
    store.setPomodoroBreakDuration(parseInt(breakDuration, 10) || 5);
    alert("Settings saved!");
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Settings</h1>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">General</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Journal Vault Folder Path</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={vaultPath}
              onChange={(e) => setVaultPath(e.target.value)}
              placeholder="C:\Users\Name\Documents\Notes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Focus Mode Defaults</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Focus Wallpaper Path (.jpg, .png)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={wallpaperPath}
              onChange={(e) => setWallpaperPath(e.target.value)}
              placeholder="C:\Pictures\focus.jpg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Background Audio Path (.mp3, .ogg)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={audioPath}
              onChange={(e) => setAudioPath(e.target.value)}
              placeholder="C:\Music\lofi.mp3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Apps to Block (comma separated names)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={appsToBlock}
              onChange={(e) => setAppsToBlock(e.target.value)}
              placeholder="Discord, Spotify, Telegram"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pomodoro Work Duration (min)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={workDuration}
                onChange={(e) => setWorkDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pomodoro Break Duration (min)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
              />
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
