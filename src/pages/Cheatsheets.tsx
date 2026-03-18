import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import { summarizeCheatsheet } from "../lib/ai";
import { toast } from "../lib/toastStore";
import { FileText, Plus, Brain, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import { marked } from "marked";
import DOMPurify from "dompurify";

export default function Cheatsheets() {
  const { vaultPath, geminiApiKey } = useAppStore();
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState("");

  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vaultPath) {
      loadSheets();
    }
  }, [vaultPath]);

  const loadSheets = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string[]>("list_notes", { dir: vaultPath });
      const filtered = result.filter(r => r.includes("cheatsheet_"));
      setSheets(filtered.reverse());
    } catch (e) {
      console.error("Failed to load sheets", e);
      toast("Failed to load cheatsheets.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSheet = async (path: string) => {
    setSelectedSheet(path);
    try {
      const fileContent = await invoke<string>("read_note", { path });
      setContent(fileContent);
    } catch (e) {
      console.error("Failed to read sheet", e);
      toast("Failed to open cheatsheet.", "error");
    }
  };

  const handleSave = async () => {
    if (!selectedSheet) return;
    try {
      await invoke("write_note", { path: selectedSheet, content });
      toast("Cheatsheet saved.", "success");
    } catch (e) {
      console.error("Failed to save sheet", e);
      toast("Failed to save cheatsheet.", "error");
    }
  };

  const handleCreateNew = async (name: string) => {
    if (!vaultPath) return;
    const sanitized = name.trim();
    if (!sanitized) return;

    const path = `${vaultPath}\\cheatsheet_${sanitized}.md`;
    try {
      await invoke("write_note", { path, content: `# ${sanitized} Cheatsheet\n\n| Term | Definition |\n|---|---|\n| Example Term | Example Definition |` });
      setIsNewSheetModalOpen(false);
      setNewSheetName("");
      await loadSheets();
      handleSelectSheet(path);
    } catch (e) {
      console.error("Failed to create sheet", e);
      toast("Failed to create cheatsheet.", "error");
    }
  };

  const handleGenerateAI = async () => {
    if (!geminiApiKey) {
      toast("Please set your Gemini API key in Settings first.", "warning");
      return;
    }
    if (!aiInputText.trim()) {
      toast("Please paste some text to summarize.", "warning");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await summarizeCheatsheet(geminiApiKey, aiInputText);
      if (result) {
        setContent(prev => prev + "\n\n" + result);
        toast("Summary appended successfully!", "success");
        setAiPanelOpen(false);
        setAiInputText("");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (!vaultPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] p-8">
        <FileText size={48} className="mb-4 opacity-20" />
        <p className="font-mono text-sm text-center">Please set a Vault Path in Settings to use Cheatsheets.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)] cheatsheet-page">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .cheatsheet-page {
            background: white !important;
          }
          .cheatsheet-print-area, .cheatsheet-print-area * {
            visibility: visible;
          }
          .cheatsheet-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            padding: 2cm;
          }
          .cheatsheet-print-area table {
            border-collapse: collapse;
            width: 100%;
          }
          .cheatsheet-print-area th, .cheatsheet-print-area td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .cheatsheet-print-area th {
            background-color: #f2f2f2;
          }
          .cheatsheet-print-area tr:nth-child(even) {
            background-color: #f9f9f9;
          }
        }
      `}</style>

      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-base)]">
        <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h2 className="font-serif font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
            <FileText size={18} className="text-[var(--accent-gold)]" /> Cheatsheets
          </h2>
          <button
            className="px-2 py-1 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] rounded hover:border-[var(--accent-gold)] transition-colors flex items-center justify-center"
            onClick={() => setIsNewSheetModalOpen(true)}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {isLoading ? (
            <div className="p-2 space-y-2">
               <Loader className="h-8 w-full" />
               <Loader className="h-8 w-full" />
            </div>
          ) : sheets.length > 0 ? (
            sheets.map(file => {
              const fileName = file.split('\\').pop() || file.split('/').pop() || file;
              const displayName = fileName.replace('cheatsheet_', '').replace('.md', '');
              return (
                <button
                  key={file}
                  className={`w-full text-left px-3 py-2 text-sm font-mono rounded-lg truncate flex items-center gap-2 transition-colors ${
                    selectedSheet === file
                      ? 'bg-[var(--bg-elevated)] text-[var(--accent-gold)] border-l-2 border-l-[var(--accent-gold)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-2 border-l-transparent'
                  }`}
                  onClick={() => handleSelectSheet(file)}
                  title={displayName}
                >
                  <FileText size={14} className="shrink-0 opacity-70" />
                  {displayName}
                </button>
              );
            })
          ) : (
            <div className="text-[10px] font-mono text-[var(--text-muted)] p-2 text-center">No cheatsheets found.</div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-surface)] relative overflow-hidden">
        {selectedSheet ? (
          <>
            <div className="h-16 shrink-0 p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-base)]">
              <h2 className="text-2xl font-serif text-[var(--text-primary)] truncate">
                {(selectedSheet.split('\\').pop() || "").replace('cheatsheet_', '').replace('.md', '')}
              </h2>
              <div className="flex gap-3">
                 <button
                  className="px-4 py-1.5 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono text-sm rounded-md hover:border-[var(--accent-gold)] transition-colors flex items-center gap-2"
                  onClick={handleExportPDF}
                  title="Print to PDF"
                >
                  <Download size={14} /> Export PDF
                </button>
                <button
                  className="px-4 py-1.5 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono text-sm rounded-md hover:border-[var(--accent-gold)] transition-colors flex items-center gap-2"
                  onClick={() => setAiPanelOpen(true)}
                >
                  <Brain size={14} /> AI Summarize
                </button>
                <button
                  className="px-6 py-1.5 bg-[var(--accent-gold)] text-[#1a1510] font-mono text-sm rounded-md hover:bg-[var(--accent-gold-dim)] hover:text-white transition-colors font-medium"
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 flex gap-4 p-6 overflow-hidden">
              {/* Editor */}
              <div className="flex-1 border border-[var(--border-default)] rounded-xl overflow-hidden flex flex-col bg-[var(--bg-base)] shadow-[var(--shadow-card)]">
                <div className="bg-[var(--bg-elevated)] px-4 py-2 text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-subtle)]">
                  Markdown Source
                </div>
                <textarea
                  className="w-full h-full p-6 bg-transparent text-[var(--text-primary)] resize-none focus:outline-none font-mono text-sm custom-scrollbar leading-relaxed"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  spellCheck="false"
                />
              </div>

              {/* Preview */}
              <div className="flex-1 border border-[var(--border-default)] rounded-xl overflow-hidden flex flex-col bg-[var(--bg-base)] shadow-[var(--shadow-card)]">
                <div className="bg-[var(--bg-elevated)] px-4 py-2 text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-subtle)]">
                  Preview
                </div>
                <div
                  ref={previewRef}
                  className="flex-1 p-6 overflow-y-auto custom-scrollbar cheatsheet-print-area bg-[var(--bg-base)]"
                >
                  <table className="w-full text-left border-collapse font-sans text-sm">
                    <tbody>
                      {content.split('\n').filter(line => line.includes('|') && !line.includes('---|---')).map((line, i) => {
                        const parts = line.split('|').filter(p => p.trim() !== "");
                        if (parts.length < 2) return null;

                        // Parse markdown inline for bold/italics
                        const termHtml = DOMPurify.sanitize(marked.parseInline(parts[0].trim(), { async: false }) as string);
                        const defHtml = DOMPurify.sanitize(marked.parseInline(parts[1].trim(), { async: false }) as string);

                        return (
                          <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                            <td
                              className="py-3 pr-4 font-mono font-medium text-[var(--accent-gold)] align-top w-1/3"
                              dangerouslySetInnerHTML={{ __html: termHtml }}
                            />
                            <td
                              className="py-3 align-top text-[var(--text-secondary)] leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: defHtml }}
                            />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(!content.includes('|') || content.trim() === "") && (
                     <div className="text-[var(--text-muted)] font-mono text-sm h-full flex items-center justify-center">
                       No table data found. Create a markdown table with Term | Definition.
                     </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
            <FileText size={48} className="mb-4 opacity-10" />
            <p className="font-mono text-sm">Select a cheatsheet to view and edit</p>
          </div>
        )}

        {/* AI Slide-in Panel */}
        <AnimatePresence>
          {aiPanelOpen && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 h-full w-[450px] bg-[var(--bg-elevated)] border-l border-[var(--border-default)] shadow-2xl flex flex-col z-30"
            >
              <div className="p-5 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-base)]">
                <h3 className="font-serif text-lg text-[var(--text-primary)] flex items-center gap-2"><Brain size={18} className="text-[var(--accent-gold)]"/> AI Summarize</h3>
                <button onClick={() => setAiPanelOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-4">
                <p className="text-xs font-mono text-[var(--text-secondary)] leading-relaxed">
                  Paste your notes or text below. Gemini will summarize it into a two-column markdown table and append it to your current cheatsheet.
                </p>
                <textarea
                  className="flex-1 w-full px-4 py-3 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--border-active)] font-sans text-sm custom-scrollbar"
                  placeholder="Paste text to summarize..."
                  value={aiInputText}
                  onChange={e => setAiInputText(e.target.value)}
                />
                <button
                  className="w-full py-3 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-md font-mono text-sm hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                >
                  {isGenerating ? <><Loader className="w-4 h-4 bg-transparent"/> Summarizing...</> : 'Summarize & Append'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Cheatsheet Modal */}
      <Modal isOpen={isNewSheetModalOpen} onClose={() => setIsNewSheetModalOpen(false)} title="Create New Cheatsheet">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateNew(newSheetName); }}>
          <label className="block text-sm font-mono text-[var(--text-secondary)] mb-2">Cheatsheet Topic Name</label>
          <input
            autoFocus
            type="text"
            className="w-full px-4 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)] font-mono text-sm mb-6"
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.target.value)}
            placeholder="e.g. ReactHooks"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setIsNewSheetModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--accent-gold)] text-[#1a1510] rounded-md font-mono text-sm font-medium hover:bg-[var(--accent-gold-dim)] hover:text-white transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}