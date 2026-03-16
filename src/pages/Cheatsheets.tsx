import { useState, useEffect } from "react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";

export default function Cheatsheets() {
  const { vaultPath, anthropicApiKey } = useAppStore();
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (vaultPath) {
      loadSheets();
    }
  }, [vaultPath]);

  const loadSheets = async () => {
    try {
      const result = await invoke<string[]>("list_notes", { dir: vaultPath });
      const filtered = result.filter(r => r.includes("cheatsheet_"));
      setSheets(filtered);
    } catch (e) {
      console.error("Failed to load sheets", e);
    }
  };

  const handleSelectSheet = async (path: string) => {
    setSelectedSheet(path);
    try {
      const fileContent = await invoke<string>("read_note", { path });
      setContent(fileContent);
    } catch (e) {
      console.error("Failed to read sheet", e);
    }
  };

  const handleSave = async () => {
    if (!selectedSheet) return;
    try {
      await invoke("write_note", { path: selectedSheet, content });
      alert("Saved!");
    } catch (e) {
      console.error("Failed to save sheet", e);
    }
  };

  const handleCreateNew = async () => {
    if (!vaultPath) return;
    const name = prompt("Enter cheatsheet name:");
    if (!name) return;
    const path = `${vaultPath}\\cheatsheet_${name}.md`;
    try {
      await invoke("write_note", { path, content: `# ${name} Cheatsheet\n\n| Term | Definition |\n|---|---|` });
      loadSheets();
      handleSelectSheet(path);
    } catch (e) {
      console.error("Failed to create sheet", e);
    }
  };

  const handleGenerateAI = async () => {
    if (!anthropicApiKey) {
      alert("Please set your Anthropic API key in Settings first.");
      return;
    }
    const text = prompt("Paste text to summarize into a cheatsheet:");
    if (!text) return;

    setIsGenerating(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Create a markdown cheatsheet summarizing the following text. The output MUST be a strict Markdown table with exactly two columns: Term | Definition. Do not include any other text before or after the table.\n\nText: ${text}`
          }]
        })
      });

      const data = await response.json();
      if (data.content && data.content[0] && data.content[0].text) {
        setContent(content + "\n\n" + data.content[0].text.trim());
        alert("Summary appended successfully!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate summary. See console.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!vaultPath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        Please set a Vault Path in Settings to use Cheatsheets.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-1/4 min-w-64 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-bold">Cheatsheets</h2>
          <button
            className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded"
            onClick={handleCreateNew}
          >
            + New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {sheets.map(file => {
              const fileName = file.split('\\').pop() || file.split('/').pop() || file;
              const displayName = fileName.replace('cheatsheet_', '').replace('.md', '');
              return (
                <li
                  key={file}
                  className={`px-3 py-1.5 text-sm cursor-pointer rounded-md truncate ${selectedSheet === file ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                  onClick={() => handleSelectSheet(file)}
                >
                  📝 {displayName}
                </li>
              );
            })}
            {sheets.length === 0 && <div className="text-xs text-muted-foreground p-2 text-center">No cheatsheets found.</div>}
          </ul>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden gap-4">
        {selectedSheet ? (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold truncate">{(selectedSheet.split('\\').pop() || "").replace('cheatsheet_', '').replace('.md', '')}</h2>
              <div className="flex gap-2">
                <button
                  className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium border border-border"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "AI Summarize Text"}
                </button>
                <button
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden">
              <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col">
                <div className="bg-muted px-3 py-1 text-xs font-bold text-muted-foreground uppercase border-b border-border">Editor</div>
                <textarea
                  className="w-full h-full p-4 bg-background text-foreground resize-none focus:outline-none font-mono text-sm"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col">
                <div className="bg-muted px-3 py-1 text-xs font-bold text-muted-foreground uppercase border-b border-border">Preview (Two-Column Layout)</div>
                <div className="flex-1 p-4 bg-card overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      {content.split('\n').filter(line => line.includes('|') && !line.includes('---|---')).map((line, i) => {
                        const parts = line.split('|').filter(p => p.trim() !== "");
                        if (parts.length < 2) return null;
                        return (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 pr-4 font-bold align-top w-1/3">{parts[0].trim()}</td>
                            <td className="py-2 align-top text-muted-foreground">{parts[1].trim()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a cheatsheet to view and edit
          </div>
        )}
      </div>
    </div>
  );
}