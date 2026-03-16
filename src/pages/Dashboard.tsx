import { useState, useEffect } from "react";
import { listDecks, listFocusSessions } from "../lib/db";

export default function Dashboard() {
  const [deckCount, setDeckCount] = useState(0);
  const [focusTime, setFocusTime] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const decks = await listDecks();
        setDeckCount(decks.length);

        const sessions = await listFocusSessions();
        const totalTime = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
        setFocusTime(totalTime);
      } catch (e) {
        console.error("Failed to load stats", e);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back to Student OS. Here's your overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Total Decks</h3>
          <p className="text-3xl font-bold mt-2">{deckCount}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Total Focus Time</h3>
          <p className="text-3xl font-bold mt-2">{focusTime} <span className="text-lg font-normal text-muted-foreground">min</span></p>
        </div>
      </div>
    </div>
  );
}
