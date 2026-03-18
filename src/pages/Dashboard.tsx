import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../lib/store";
import { listDecks, listFocusSessions, getDueCards } from "../lib/db";
import { Clock, BookOpen, Flame, LayoutDashboard, FileText } from "lucide-react";
import Loader from "../components/Loader";

const QUOTES = [
  "Study without desire spoils the memory, and it retains nothing that it takes in.",
  "The only real mistake is the one from which we learn nothing.",
  "It does not matter how slowly you go as long as you do not stop.",
  "Education is what remains after one has forgotten what one has learned in school.",
  "Intellectual growth should commence at birth and cease only at death.",
  // ... adding enough quotes to just modulo nicely
];
// Populate a solid 50
for(let i = 5; i < 50; i++) QUOTES.push("There are no shortcuts to any place worth going.");

interface RecentNote {
  path: string;
  name: string;
}

export default function Dashboard() {
  const store = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [streakDays, setStreakDays] = useState<boolean[]>([]);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);

  const [quote, setQuote] = useState("");

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        // Due Today
        const decks = await listDecks();
        let dueCount = 0;
        for (const d of decks) {
          const due = await getDueCards(d.id);
          dueCount += due.length;
        }
        setDueCardsCount(dueCount);

        // Focus & Streak
        const sessions = await listFocusSessions();
        const totalTime = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
        setTotalFocusTime(totalTime);

        // Calculate 14-day streak based on focus sessions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const streak: boolean[] = Array(14).fill(false);

        sessions.forEach(s => {
          if (!s.duration_minutes || s.duration_minutes <= 0) return;
          const sessionDate = new Date(s.started_at);
          sessionDate.setHours(0, 0, 0, 0);
          const diffTime = Math.abs(today.getTime() - sessionDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 14) {
            streak[13 - diffDays] = true;
          }
        });
        setStreakDays(streak);

        // Recent Notes
        if (store.vaultPath) {
          try {
            const files = await invoke<string[]>("list_notes", { dir: store.vaultPath });
            // Tauri backend list_notes doesn't return mod time yet, so we just take last 5 as an approximation
            // For a real app we'd need a Rust update to get metadata.
            const sortedFiles = files.reverse().slice(0, 5);
            setRecentNotes(sortedFiles.map(f => {
              const name = f.split('\\').pop() || f.split('/').pop() || f;
              return { path: f, name: name.replace('.md', '') };
            }));
          } catch (e) {
            console.error("Failed to load notes", e);
          }
        }

        // Quote
        const dayOfYear = Math.floor((Date.now() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        setQuote(QUOTES[dayOfYear % 50]);

      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, [store.vaultPath]);

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8 flex items-center gap-3">
        <LayoutDashboard className="text-[var(--accent-gold)]" size={32} strokeWidth={1.5} />
        <h1 className="text-4xl font-serif font-semibold text-[var(--text-primary)]">Overview</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 grid-rows-[auto_1fr_1fr]">
           <Loader className="col-span-1 md:col-span-2 h-48" />
           <Loader className="col-span-1 md:col-span-1 h-96 row-span-2" />
           <Loader className="col-span-1 md:col-span-1 h-40" />
           <Loader className="col-span-1 md:col-span-1 h-40" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">

          {/* Due Today - Wide */}
          <Link to="/flashcards" className="group col-span-1 md:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-8 shadow-[var(--shadow-card)] relative overflow-hidden flex flex-col justify-center hover:border-[var(--border-active)] transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[var(--accent-gold)] to-[var(--accent-ember)]" />
            <h3 className="text-sm font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-2">Due Today</h3>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-serif text-[var(--text-primary)] font-semibold">{dueCardsCount}</span>
              <span className="text-xl font-mono text-[var(--text-muted)]">cards to review</span>
            </div>
            <p className="mt-4 text-[var(--accent-gold)] font-mono text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              Start Session &rarr;
            </p>
          </Link>

          {/* Focus Quick-Start - Tall */}
          <div className="col-span-1 md:col-span-1 md:row-span-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-8 shadow-[var(--shadow-card)] flex flex-col relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--accent-gold)] rounded-full mix-blend-overlay opacity-5 blur-3xl group-hover:opacity-10 transition-opacity" />

            <h3 className="text-sm font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-8">Focus Session</h3>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center mb-10">
                <div className="text-5xl font-serif text-[var(--text-primary)] mb-2">{store.pomodoroWorkDuration}<span className="text-xl text-[var(--text-muted)] font-mono ml-2">min</span></div>
                <div className="text-sm font-mono text-[var(--text-secondary)]">Work / {store.pomodoroBreakDuration}m Break</div>
              </div>

              <Link to="/focus" className="w-full py-4 bg-[var(--accent-gold)] text-[#1a1510] font-mono font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--accent-gold-dim)] hover:text-white transition-all hover:scale-[1.02] shadow-[var(--shadow-glow)]">
                <Flame size={20} />
                Begin Focus
              </Link>
            </div>
          </div>

          {/* Streak / Stats */}
          <div className="col-span-1 md:col-span-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 shadow-[var(--shadow-card)] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-1 flex items-center gap-2">
                <Clock size={16} /> Total Focus
              </h3>
              <p className="text-3xl font-serif text-[var(--text-primary)]">{totalFocusTime} <span className="text-lg font-mono text-[var(--text-muted)]">min</span></p>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-mono text-[var(--text-muted)] uppercase mb-3">14-Day Streak</h4>
              <div className="flex gap-1.5 w-full justify-between">
                {streakDays.map((studied, i) => (
                  <div
                    key={i}
                    className={`h-6 flex-1 rounded-sm ${studied ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'}`}
                    title={studied ? "Studied" : "Missed"}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Recent Notes */}
          <div className="col-span-1 md:col-span-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 shadow-[var(--shadow-card)] flex flex-col">
            <h3 className="text-sm font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <BookOpen size={16} /> Recent Notes
            </h3>

            <div className="flex-1 flex flex-col gap-3">
              {recentNotes.length > 0 ? (
                recentNotes.map((note, i) => (
                  <Link key={i} to="/journal" className="group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <FileText size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] transition-colors" />
                    <span className="font-mono text-sm text-[var(--text-primary)] truncate">{note.name}</span>
                  </Link>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm font-mono text-[var(--text-muted)]">
                  {store.vaultPath ? "No notes found." : "Vault not configured."}
                </div>
              )}
            </div>
          </div>

          {/* Quote of the Day */}
          <div className="col-span-1 md:col-span-2 bg-transparent p-6 flex items-center justify-center text-center">
            <p className="font-serif text-2xl text-[var(--text-secondary)] italic max-w-2xl leading-relaxed">
              "{quote}"
            </p>
          </div>

        </div>
      )}
    </div>
  );
}