import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { BookOpen, Search, Plus, FileText, X } from "lucide-react";
import { toast } from "../lib/toastStore";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

interface FileItem {
  path: string;
  name: string;
}

export default function Journal() {
  const { vaultPath } = useAppStore();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{path: string, content: string}[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");
  const [newNoteError, setNewNoteError] = useState("");

  const contentRef = useRef(content);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (vaultPath) {
      loadFiles();
    }
  }, [vaultPath]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string[]>("list_notes", { dir: vaultPath });
      // Grouping logic (simplified to just displaying for now, as real grouping requires rust file metadata)
      setFiles(result.map(f => {
        const name = f.split('\\').pop() || f.split('/').pop() || f;
        return { path: f, name: name.replace('.md', '') };
      }).reverse());
    } catch (e) {
      console.error("Failed to load files", e);
      toast("Failed to load journal files.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = async (path: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      await saveContent(selectedFile, contentRef.current);
    }

    setSelectedFile(path);
    try {
      const fileContent = await invoke<string>("read_note", { path });
      setContent(fileContent);
      setShowSavedIndicator(false);
    } catch (e) {
      console.error("Failed to read note", e);
      toast("Failed to open note.", "error");
    }
  };

  const saveContent = async (path: string | null, text: string) => {
    if (!path) return;
    setIsSaving(true);
    try {
      await invoke("write_note", { path, content: text });
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (e) {
      console.error("Failed to save note", e);
      toast("Failed to save note.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const debouncedSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveContent(selectedFile, newContent);
    }, 1500);
  }, [selectedFile]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setShowSavedIndicator(false);
    debouncedSave(value);
  };

  const handleCreateNew = async (name: string, contentStr?: string) => {
    if (!vaultPath) return;
    const sanitized = name.trim();
    if (!sanitized) {
      setNewNoteError("Filename cannot be empty.");
      return;
    }

    if (/[\\/:*?"<>|]/.test(sanitized)) {
      setNewNoteError("Filename contains invalid characters (\\/:*?\"<>|).");
      return;
    }

    const path = `${vaultPath}\\${sanitized}.md`;
    try {
      await invoke("write_note", { path, content: contentStr || `# ${sanitized}` });
      setIsNewNoteModalOpen(false);
      setNewNoteName("");
      setNewNoteError("");
      await loadFiles();
      handleSelectFile(path);
    } catch (e) {
      console.error("Failed to create note", e);
      setNewNoteError("Failed to create note. Ensure path is valid.");
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
      toast("Search failed.", "error");
    }
  };

  // Find wikilinks
  const wikilinks = Array.from(content.matchAll(/\[\[(.*?)\]\]/g)).map(m => m[1]);
  // Compute basic metadata
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = content.length;

  if (!vaultPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] p-8">
        <BookOpen size={48} className="mb-4 opacity-20" />
        <p className="font-mono text-sm text-center">Please set a Vault Path in Settings to use the Journal.</p>
      </div>
    );
  }

  const customTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)]">
      {/* Left Pane: File Tree */}
      <div className="w-64 shrink-0 border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-base)]">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-serif font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen size={18} className="text-[var(--accent-gold)]" /> Journal
            </h2>
            <button
              className="px-2 py-1 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] rounded hover:border-[var(--accent-gold)] transition-colors flex items-center justify-center"
              onClick={() => { setNewNoteError(""); setIsNewNoteModalOpen(true); }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full pl-9 pr-3 py-1.5 text-sm font-mono border border-[var(--border-default)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] placeholder:text-[var(--text-muted)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
               <Loader className="h-8 w-full" />
               <Loader className="h-8 w-full" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest">Search Results</span>
                <button onClick={() => { setSearchResults([]); setSearchQuery(""); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={14}/>
                </button>
              </div>
              {searchResults.map((res, i) => (
                <div
                  key={i}
                  className="p-2 hover:bg-[var(--bg-hover)] cursor-pointer rounded-lg text-sm border border-transparent hover:border-[var(--border-default)] transition-colors"
                  onClick={() => {
                    handleSelectFile(res.path);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                >
                  <div className="font-mono font-medium text-[var(--text-primary)] truncate flex items-center gap-2">
                    <FileText size={14} className="text-[var(--text-muted)] shrink-0"/>
                    {res.path.split('\\').pop()?.replace('.md', '')}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-1 bg-[var(--bg-surface)] px-1 rounded">
                    {res.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest px-2 mb-2 mt-2">All Notes</div>
              {files.map(file => (
                <button
                  key={file.path}
                  className={`w-full text-left px-3 py-2 text-sm font-mono rounded-lg truncate flex items-center gap-2 transition-colors ${
                    selectedFile === file.path
                      ? 'bg-[var(--bg-elevated)] text-[var(--accent-gold)] border-l-2 border-l-[var(--accent-gold)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-2 border-l-transparent'
                  }`}
                  onClick={() => handleSelectFile(file.path)}
                  title={file.name}
                >
                  <FileText size={14} className="shrink-0 opacity-70" />
                  {file.name}
                </button>
              ))}
              {files.length === 0 && <div className="text-[10px] font-mono text-[var(--text-muted)] p-2 text-center">No files found.</div>}
            </div>
          )}
        </div>
      </div>

      {/* Center Pane: Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-surface)]">
        {selectedFile ? (
          <>
            <div className="h-14 shrink-0 flex justify-between items-center px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
              <div className="font-mono text-[13px] text-[var(--text-secondary)] truncate flex items-center gap-2">
                <FileText size={14} className="text-[var(--text-muted)]"/>
                {selectedFile.replace(vaultPath || '', '').replace(/^\\/, '').replace(/^\//, '')}
              </div>
              <div className="flex items-center gap-4">
                {showSavedIndicator && (
                  <span className="text-[11px] font-mono text-[var(--accent-moss)] animate-in fade-in zoom-in duration-300">
                    Saved ✓
                  </span>
                )}
                {isSaving && !showSavedIndicator && (
                  <span className="text-[11px] font-mono text-[var(--text-muted)] animate-pulse">
                    Saving...
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[var(--bg-surface)]">
              {/* Note: In a real app we'd configure a custom CodeMirror theme here to perfectly match the css variables. */}
              <CodeMirror
                value={content}
                height="100%"
                extensions={[markdown({ base: markdownLanguage })]}
                onChange={handleContentChange}
                theme={customTheme}
                className="h-full text-[14px] font-mono editor-custom"
                basicSetup={{
                  lineNumbers: false,
                  foldGutter: false,
                  highlightActiveLine: false,
                }}
              />
              <style>{`
                .editor-custom .cm-content {
                  padding: 24px 32px;
                  max-width: 800px;
                  margin: 0 auto;
                  line-height: 1.7;
                  color: var(--text-primary);
                }
                .editor-custom .cm-cursor {
                  border-left-color: var(--accent-gold) !important;
                  border-left-width: 2px !important;
                }
                .editor-custom .cm-selectionBackground {
                  background-color: rgba(201,168,76,0.2) !important;
                }
              `}</style>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
            <FileText size={48} className="mb-4 opacity-10" />
            <p className="font-mono text-sm">Select a file to start editing</p>
          </div>
        )}
      </div>

      {/* Right Pane: Metadata & Wikilinks */}
      {selectedFile && (
        <div className="w-64 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-base)] flex flex-col">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="block text-[var(--text-muted)] mb-1">Words</span>
                <span className="text-[var(--text-primary)]">{wordCount}</span>
              </div>
              <div>
                <span className="block text-[var(--text-muted)] mb-1">Characters</span>
                <span className="text-[var(--text-primary)]">{charCount}</span>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Linked Mentions</h3>
            <div className="space-y-2">
              {wikilinks.map((linkName, idx) => {
                // Support folders in wikilinks [[folder/note]]
                const sanitizedLinkName = linkName.replace(/\//g, '\\');
                const targetPath = `${vaultPath}\\${sanitizedLinkName}.md`;
                // Basic check if it exists in our local list (which handles flat list mostly, but let's be robust)
                const exists = files.some(f => f.path === targetPath);

                return (
                  <div
                    key={idx}
                    className="p-2 border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-md font-mono text-xs hover:border-[var(--accent-gold)] transition-colors cursor-pointer group"
                    onClick={() => {
                      if (exists) {
                        handleSelectFile(targetPath);
                      } else {
                        // Create it!
                        const targetNameParts = linkName.split(/[\/\\]/);
                        const fileName = targetNameParts.pop() || linkName;
                        handleCreateNew(linkName, `# ${fileName}\n\n*Created from wikilink.*\n`);
                      }
                    }}
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors truncate block">
                      [[{linkName}]]
                    </span>
                    {!exists && (
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <Plus size={10} /> Click to create
                      </span>
                    )}
                  </div>
                );
              })}
              {wikilinks.length === 0 && (
                <p className="text-[10px] font-mono text-[var(--text-muted)]">No outbound links.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Note Modal */}
      <Modal isOpen={isNewNoteModalOpen} onClose={() => setIsNewNoteModalOpen(false)} title="Create New Note">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateNew(newNoteName); }}>
          <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">Note Name (without .md)</label>
          <input
            autoFocus
            type="text"
            className={`w-full px-4 py-2 border rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none font-mono text-sm mb-2 ${newNoteError ? 'border-[var(--accent-ember)]' : 'border-[var(--border-default)] focus:border-[var(--border-active)]'}`}
            value={newNoteName}
            onChange={(e) => {
              setNewNoteName(e.target.value);
              setNewNoteError("");
            }}
          />
          {newNoteError && (
            <p className="text-xs font-mono text-[var(--accent-ember)] mb-4">{newNoteError}</p>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setIsNewNoteModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--accent-gold)] text-[#1a1510] rounded-md font-mono text-sm font-medium hover:bg-[var(--accent-gold-dim)] hover:text-white transition-colors"
            >
              Create Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}