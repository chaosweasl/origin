import { useState, useEffect } from "react";
import {
  Deck, Card, listDecks, listCards,
  QuizSession, listQuizSessions, createQuizSession
} from "../lib/db";

export default function Quiz() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [history, setHistory] = useState<QuizSession[]>([]);

  const [quizActive, setQuizActive] = useState(false);
  const [questions, setQuestions] = useState<{card: Card, options: string[]}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function init() {
      const d = await listDecks();
      setDecks(d);
      const h = await listQuizSessions();
      setHistory(h);
    }
    init();
  }, [quizActive]);

  const startQuiz = async () => {
    if (!selectedDeck) return;
    const cards = await listCards(selectedDeck.id);
    if (cards.length < 4) {
      alert("Need at least 4 cards in a deck to generate a quiz.");
      return;
    }

    const generatedQuestions = cards.map(card => {
      const others = cards.filter(c => c.id !== card.id);
      others.sort(() => 0.5 - Math.random());
      const wrongOptions = others.slice(0, 3).map(c => c.back);
      const allOptions = [...wrongOptions, card.back].sort(() => 0.5 - Math.random());

      return {
        card,
        options: allOptions
      };
    });

    generatedQuestions.sort(() => 0.5 - Math.random());
    setQuestions(generatedQuestions.slice(0, 10));
    setScore(0);
    setCurrentQuestionIndex(0);
    setQuizActive(true);
  };

  const handleAnswer = async (answer: string) => {
    const q = questions[currentQuestionIndex];
    let newScore = score;
    if (answer === q.card.back) {
      newScore += 1;
      setScore(newScore);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      await createQuizSession(selectedDeck!.id, newScore, questions.length);
      setQuizActive(false);
      alert(`Quiz finished! You scored ${newScore}/${questions.length}`);
    }
  };

  if (quizActive && questions.length > 0) {
    const q = questions[currentQuestionIndex];
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto">
        <h2 className="text-xl mb-2 text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</h2>
        <div className="text-2xl font-bold mb-8 text-center">{q.card.front}</div>

        <div className="w-full space-y-4">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className="w-full p-4 text-left border border-border rounded-lg bg-card hover:bg-muted transition-colors"
              onClick={() => handleAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Quiz</h1>

      <div className="flex gap-8">
        <div className="w-1/2 bg-card p-6 border border-border rounded-xl">
          <h2 className="text-2xl font-bold mb-4">Start a Quiz</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Deck</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedDeck?.id || ""}
              onChange={e => {
                const d = decks.find(x => x.id === parseInt(e.target.value));
                setSelectedDeck(d || null);
              }}
            >
              <option value="">-- Choose a deck --</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button
            className="w-full py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
            onClick={startQuiz}
            disabled={!selectedDeck}
          >
            Start Quiz
          </button>
        </div>

        <div className="w-1/2 bg-card p-6 border border-border rounded-xl">
          <h2 className="text-2xl font-bold mb-4">History</h2>
          <div className="space-y-4">
            {history.map(h => (
              <div key={h.id} className="flex justify-between items-center p-3 border-b border-border/50">
                <div>
                  <div className="font-medium">Deck {decks.find(d => d.id === h.deck_id)?.name || h.deck_id}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.taken_at).toLocaleString()}</div>
                </div>
                <div className="text-lg font-bold">
                  {h.score} / {h.total}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-muted-foreground">No quizzes taken yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}