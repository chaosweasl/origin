import { useState } from "react";
import { useAppStore } from "../lib/store";
import { toast } from "../lib/toastStore";
import { open } from "@tauri-apps/plugin-dialog";
import { askGemini } from "../lib/ai";
import { X } from "lucide-react";

export default function Settings() {
  const store = useAppStore();

  const [activeTab, setActiveTab] = useState<"general" | "ai" | "focus" | "about">("general");

  const [vaultPath, setVaultPath] = useState(store.vaultPath || "");
  const [wallpaperPath, setWallpaperPath] = useState(store.focusWallpaperPath || "");
  const [audioPath, setAudioPath] = useState(store.focusAudioPath || "");
  const [appsToBlock, setAppsToBlock] = useState(store.focusAppsToBlock);
  const [appInput, setAppInput] = useState("");
  const [apiKey, setApiKey] = useState(store.geminiApiKey || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [workDuration, setWorkDuration] = useState(store.pomodoroWorkDuration.toString());
  const [breakDuration, setBreakDuration] = useState(store.pomodoroBreakDuration.toString());

  const handleSave = () => {
    store.setVaultPath(vaultPath);
    store.setFocusWallpaperPath(wallpaperPath);
    store.setFocusAudioPath(audioPath);
    store.setFocusAppsToBlock(appsToBlock);
    store.setGeminiApiKey(apiKey);
    store.setPomodoroWorkDuration(parseInt(workDuration, 10) || 25);
    store.setPomodoroBreakDuration(parseInt(breakDuration, 10) || 5);
    toast("Settings saved successfully!", "success");
  };

  const handleBrowseVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        setVaultPath(selected);
      }
    } catch (e) {
      console.error("Failed to open dialog", e);
      toast("Failed to open directory browser.", "error");
    }
  };

  const handleBrowseFile = async (setter: (val: string) => void) => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        setter(selected);
      }
    } catch (e) {
      console.error("Failed to open dialog", e);
      toast("Failed to open file browser.", "error");
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast("Please enter an API key first.", "warning");
      return;
    }
    toast("Testing AI connection...", "info");
    const result = await askGemini(apiKey, "Reply with only the word 'Success'.");
    if (result && result.toLowerCase().includes("success")) {
      toast("Connection successful!", "success");
    } else {
      toast("Connection failed. Check your API key.", "error");
    }
  };

  const handleAddApp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && appInput.trim()) {
      let newApp = appInput.trim();
      if (newApp.toLowerCase().endsWith(".exe")) {
        newApp = newApp.slice(0, -4);
      }
      if (!appsToBlock.includes(newApp)) {
        setAppsToBlock([...appsToBlock, newApp]);
      }
      setAppInput("");
    }
  };

  const handleRemoveApp = (appToRemove: string) => {
    setAppsToBlock(appsToBlock.filter((app) => app !== appToRemove));
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "ai", label: "AI" },
    { id: "focus", label: "Focus Mode" },
    { id: "about", label: "About" },
  ] as const;

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif font-semibold text-[var(--text-primary)]">Settings</h1>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[var(--accent-gold)] text-[#1a1510] font-medium rounded-md hover:bg-[var(--accent-gold-dim)] hover:text-white transition-colors shadow-sm"
        >
          Save Changes
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] shadow-[var(--shadow-card)]">
        {/* Sidebar Tabs */}
        <div className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] flex flex-col py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-left font-mono text-sm transition-colors relative ${
                activeTab === tab.id
                  ? "text-[var(--accent-gold)] bg-[var(--bg-hover)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {activeTab === tab.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-gold)]" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === "general" && (
            <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-xl font-serif text-[var(--text-primary)] mb-4">General Settings</h2>
                <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">
                  Journal Vault Folder Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm"
                    value={vaultPath}
                    onChange={(e) => setVaultPath(e.target.value)}
                    placeholder="C:\Users\Name\Documents\Notes"
                  />
                  <button
                    onClick={handleBrowseVault}
                    className="px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-hover)] text-[var(--text-primary)] font-mono text-sm hover:border-[var(--accent-gold)] transition-colors"
                  >
                    Browse
                  </button>
                </div>
                <p className="mt-2 text-xs font-mono text-[var(--text-muted)]">
                  The local directory where your markdown journal notes and cheatsheets will be saved.
                </p>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-xl font-serif text-[var(--text-primary)] mb-4">AI Configuration</h2>
                <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="w-full px-4 py-2 pr-12 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono text-xs"
                  >
                    {showApiKey ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p className="mt-2 text-xs font-mono text-[var(--text-muted)]">
                  Get your free API key from Google AI Studio. Required for Flashcard Generation and Cheatsheet Summarization.
                </p>
              </div>
              <div>
                <button
                  onClick={handleTestConnection}
                  className="px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-hover)] text-[var(--text-primary)] font-mono text-sm hover:border-[var(--accent-gold)] transition-colors"
                >
                  Test Connection
                </button>
              </div>
            </div>
          )}

          {activeTab === "focus" && (
            <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-serif text-[var(--text-primary)] mb-4">Focus Mode Defaults</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">
                    Work Duration (min)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm"
                    value={workDuration}
                    onChange={(e) => setWorkDuration(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">
                    Break Duration (min)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">
                  Ambient Wallpaper Path (.jpg, .png)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm"
                    value={wallpaperPath}
                    onChange={(e) => setWallpaperPath(e.target.value)}
                    placeholder="Optional: C:\Pictures\focus.jpg"
                  />
                  <button
                    onClick={() => handleBrowseFile(setWallpaperPath)}
                    className="px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-hover)] text-[var(--text-primary)] font-mono text-sm hover:border-[var(--accent-gold)] transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">
                  Background Audio Path (.mp3, .ogg)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm"
                    value={audioPath}
                    onChange={(e) => setAudioPath(e.target.value)}
                    placeholder="Optional: C:\Music\lofi.mp3"
                  />
                  <button
                    onClick={() => handleBrowseFile(setAudioPath)}
                    className="px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-hover)] text-[var(--text-primary)] font-mono text-sm hover:border-[var(--accent-gold)] transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">
                  Blocked Applications
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm mb-3"
                  value={appInput}
                  onChange={(e) => setAppInput(e.target.value)}
                  onKeyDown={handleAddApp}
                  placeholder="Type app name (e.g. Discord) and press Enter"
                />
                <div className="flex flex-wrap gap-2">
                  {appsToBlock.map((app) => (
                    <div
                      key={app}
                      className="flex items-center gap-1 px-3 py-1 bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-full text-sm font-mono text-[var(--text-primary)]"
                    >
                      {app}
                      <button
                        onClick={() => handleRemoveApp(app)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-ember)] focus:outline-none"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {appsToBlock.length === 0 && (
                    <span className="text-sm font-mono text-[var(--text-muted)]">No apps blocked.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-xl font-serif text-[var(--text-primary)] mb-4">About Student OS</h2>
                <div className="p-6 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="font-mono text-[var(--text-secondary)]">Version</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="font-mono text-[var(--text-secondary)]">Author</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">Student OS Team</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[var(--text-secondary)]">License</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">MIT</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
