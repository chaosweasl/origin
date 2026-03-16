import { useState, useEffect } from "react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';

export default function Journal() {
  const { vaultPath } = useAppStore();
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{path: string, content: string}[]>([]);

  useEffect(() => {
    if (vaultPath) {
      loadFiles();
    }
  }, [vaultPath]);

  const loadFiles = async () => {
    try {
      const result = await invoke<string[]>("list_notes", { dir: vaultPath });
      setFiles(result);
    } catch (e) {
      console.error("Failed to load files", e);
    }
  };

  const handleSelectFile = async (path: string) => {
    setSelectedFile(path);
    try {
      const fileContent = await invoke<string>("read_note", { path });
      setContent(fileContent);
    } catch (e) {
      console.error("Failed to read note", e);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    try {
      await invoke("write_note", { path: selectedFile, content });
      alert("Saved!");
    } catch (e) {
      console.error("Failed to save note", e);
    }
  };

  const handleCreateNew = async () => {
    if (!vaultPath) return;
    const name = prompt("Enter note name (without .md):");
    if (!name) return;
    const path = `${vaultPath}\\${name}.md`;
    try {
      await invoke("write_note", { path, content: "# " + name });
      loadFiles();
      handleSelectFile(path);
    } catch (e) {
      console.error("Failed to create note", e);
    }
  };

  const handleSearch = async () => {
    if (!vaultPath || !searchQuery) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await invoke<{path: string, content: string}[]>("search_notes", { dir: vaultPath, query: searchQuery });
      setSearchResults(results);
    } catch (e) {
      console.error("Search failed", e);
    }
  };

  if (!vaultPath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        Please set a Vault Path in Settings to use the Journal.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-1/4 min-w-64 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h2 className="font-bold">Files</h2>
            <button
              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded"
              onClick={handleCreateNew}
            >
              + New
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search notes..."
              className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="px-2 py-1 text-sm bg-secondary rounded">🔍</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              <div className="text-xs font-bold text-muted-foreground uppercase px-2 mb-2">Search Results</div>
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  className="p-2 hover:bg-muted cursor-pointer rounded text-sm"
                  onClick={() => {
                    handleSelectFile(res.path);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                >
                  <div className="font-medium truncate">{res.path.split('\\').pop()?.replace('.md', '')}</div>
                  <div className="text-xs text-muted-foreground truncate">{res.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map(file => {
                const fileName = file.split('\\').pop() || file.split('/').pop() || file;
                const displayName = fileName.replace('.md', '');
                return (
                  <li
                    key={file}
                    className={`px-3 py-1.5 text-sm cursor-pointer rounded-md truncate ${selectedFile === file ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                    onClick={() => handleSelectFile(file)}
                    title={file}
                  >
                    📄 {displayName}
                  </li>
                );
              })}
              {files.length === 0 && <div className="text-xs text-muted-foreground p-2 text-center">No files found.</div>}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="flex justify-between items-center p-4 border-b border-border">
              <div className="font-medium text-muted-foreground truncate max-w-lg">
                {selectedFile}
              </div>
              <button
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
            <div className="flex-1 p-0 overflow-auto bg-background text-foreground">
              <CodeMirror
                value={content}
                height="100%"
                extensions={[markdown({ base: markdownLanguage })]}
                onChange={(value) => setContent(value)}
                theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
                className="h-full text-base"
              />
            </div>
            <div className="h-1/3 border-t border-border p-4 overflow-y-auto bg-muted/30">
              <h3 className="font-bold text-sm mb-2 text-muted-foreground uppercase">Linked Mentions (Wikilinks)</h3>
              <div className="space-y-2">
                {Array.from(content.matchAll(/\[\[(.*?)\]\]/g)).map((match, idx) => (
                  <div
                    key={idx}
                    className="text-sm p-2 bg-card border border-border rounded cursor-pointer hover:border-primary"
                    onClick={() => {
                      const linkName = match[1];
                      const targetPath = `${vaultPath}\\${linkName}.md`;
                      if (files.includes(targetPath) || files.includes(targetPath.replace(/\\/g, '/'))) {
                        handleSelectFile(targetPath);
                      } else {
                        alert(`File ${linkName}.md does not exist.`);
                      }
                    }}
                  >
                    Outbound link: <span className="text-primary font-medium">{match[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a file to edit
          </div>
        )}
      </div>
    </div>
  );
}