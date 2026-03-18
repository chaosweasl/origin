import { useState, useEffect } from "react";
import {
  Deck, Card, listDecks, listCards,
  QuizSession, listQuizSessions, createQuizSession
} from "../lib/db";
import { toast } from "../lib/toastStore";
import { CheckSquare, ArrowRight, RotateCcw, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionResult {
  card: Card;
  userAnswer: string;
  isCorrect: boolean;
}

export default function Quiz() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [history, setHistory] = useState<QuizSession[]>([]);
  const [deckCardCounts, setDeckCardCounts] = useState<Record<number, number>>({});

  const [quizActive, setQuizActive] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  const [questions, setQuestions] = useState<{card: Card, options: string[]}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const d = await listDecks();
        setDecks(d);

        const counts: Record<number, number> = {};
        for (const deck of d) {
          const c = await listCards(deck.id);
          counts[deck.id] = c.length;
        }
        setDeckCardCounts(counts);

        const h = await listQuizSessions();
        setHistory(h);
      } catch (e) {
        console.error("Failed to init quiz view", e);
      }
    }
    init();
  }, [quizActive, quizComplete]);

  const startQuiz = async () => {
    if (!selectedDeck) return;
    const count = deckCardCounts[selectedDeck.id] || 0;
    if (count < 4) {
      toast("Need at least 4 cards in a deck to generate a quiz.", "warning");
      return;
    }

    try {
      const cards = await listCards(selectedDeck.id);

      // Ensure we sample wrong options properly across the *entire deck*
      const generatedQuestions = cards.map(card => {
        const otherCards = cards.filter(c => c.id !== card.id);
        const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
        // Extract just the backs and take 3
        const wrongOptions = shuffledOthers.slice(0, 3).map(c => c.back);
        const allOptions = [...wrongOptions, card.back].sort(() => 0.5 - Math.random());

        return {
          card,
          options: allOptions
        };
      });

      // Limit quiz to 10 questions max
      const finalQuestions = generatedQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);

      setQuestions(finalQuestions);
      setResults([]);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setShowFeedback(false);
      setQuizActive(true);
      setQuizComplete(false);
    } catch (e) {
      console.error(e);
      toast("Failed to start quiz.", "error");
    }
  };

  const handleOptionSelect = (opt: string) => {
    if (showFeedback) return;
    setSelectedOption(opt);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption) return;

    const q = questions[currentQuestionIndex];
    const isCorrect = selectedOption === q.card.back;

    setResults(prev => [...prev, {
      card: q.card,
      userAnswer: selectedOption,
      isCorrect
    }]);

    setShowFeedback(true);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      // Complete quiz
      const score = results.filter(r => r.isCorrect).length;
      try {
        await createQuizSession(selectedDeck!.id, score, questions.length);
        setQuizActive(false);
        setQuizComplete(true);
      } catch (e) {
        console.error(e);
        toast("Failed to save quiz results.", "error");
      }
    }
  };

  // View: Quiz Complete / Results
  if (quizComplete) {
    const score = results.filter(r => r.isCorrect).length;
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="flex flex-col items-center max-w-4xl mx-auto h-full p-8 animate-in fade-in duration-500">
        <h2 className="text-4xl font-serif text-[var(--text-primary)] mb-2">Quiz Complete</h2>
        <p className="text-[var(--text-secondary)] font-mono mb-8">Here's how you did on <span className="text-[var(--text-primary)]">{selectedDeck?.name}</span></p>

        <div className="flex gap-12 mb-12">
          <div className="text-center">
            <div className="text-5xl font-serif text-[var(--accent-gold)]">{score} / {questions.length}</div>
            <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest mt-3">Final Score</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-serif text-[var(--text-primary)]">{percentage}%</div>
            <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest mt-3">Accuracy</div>
          </div>
        </div>

        <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-[var(--shadow-card)] flex flex-col flex-1 max-h-[500px]">
          <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest">
            Question Breakdown
          </div>
          <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {results.map((r, i) => (
              <div key={i} className="p-4 border border-[var(--border-default)] rounded-lg bg-[var(--bg-base)]">
                <div className="flex gap-4 items-start">
                  <div className={`mt-1 rounded-full p-1 shrink-0 ${r.isCorrect ? 'bg-[var(--accent-moss)]/20 text-[var(--accent-moss)]' : 'bg-[var(--accent-ember)]/20 text-[var(--accent-ember)]'}`}>
                    {r.isCorrect ? <Check size={16} /> : <X size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg text-[var(--text-primary)] mb-2">{r.card.front}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest block mb-1">Your Answer</span>
                        <p className={`font-mono text-sm ${r.isCorrect ? 'text-[var(--accent-moss)]' : 'text-[var(--accent-ember)] line-through opacity-80'}`}>{r.userAnswer}</p>
                      </div>
                      {!r.isCorrect && (
                        <div>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest block mb-1">Correct Answer</span>
                          <p className="font-mono text-sm text-[var(--accent-moss)]">{r.card.back}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <button
            className="px-8 py-3 bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-full font-mono text-sm hover:border-[var(--accent-gold)] text-[var(--text-primary)] transition-all flex items-center gap-2"
            onClick={() => { setQuizComplete(false); setSelectedDeck(null); }}
          >
            <RotateCcw size={16} /> Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // View: Active Quiz
  if (quizActive && questions.length > 0) {
    const q = questions[currentQuestionIndex];
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto">
        <div className="w-full mb-8">
          <div className="flex justify-between items-center mb-2 font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{selectedDeck?.name}</span>
          </div>
          <div className="w-full h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
             <div
               className="h-full bg-[var(--accent-gold)] transition-all duration-300"
               style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
             />
          </div>
        </div>

        <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-8 shadow-[var(--shadow-card)] mb-8 min-h-[200px] flex items-center justify-center">
          <div className="text-2xl font-serif text-[var(--text-primary)] text-center leading-relaxed">
            {q.card.front}
          </div>
        </div>

        <div className="w-full grid grid-cols-1 gap-4 mb-8">
          <AnimatePresence mode="popLayout">
            {q.options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              const isCorrectAnswer = opt === q.card.back;

              let btnClass = "text-left p-4 border rounded-xl font-mono text-sm transition-all ";
              if (!showFeedback) {
                btnClass += isSelected
                  ? "border-[var(--accent-gold)] bg-[var(--bg-elevated)] text-[var(--accent-gold)] shadow-[var(--shadow-glow)]"
                  : "border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:border-[var(--border-active)] hover:bg-[var(--bg-hover)]";
              } else {
                if (isCorrectAnswer) {
                  btnClass += "border-[var(--accent-moss)] bg-[var(--accent-moss)]/10 text-[var(--accent-moss)]";
                } else if (isSelected && !isCorrectAnswer) {
                  btnClass += "border-[var(--accent-ember)] bg-[var(--accent-ember)]/10 text-[var(--accent-ember)] opacity-70";
                } else {
                  btnClass += "border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-muted)] opacity-50";
                }
              }

              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={btnClass}
                  onClick={() => handleOptionSelect(opt)}
                  disabled={showFeedback}
                >
                  <div className="flex justify-between items-center">
                    <span>{opt}</span>
                    {showFeedback && isCorrectAnswer && <Check size={18} />}
                    {showFeedback && isSelected && !isCorrectAnswer && <X size={18} />}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="h-14 w-full flex justify-end">
          {!showFeedback ? (
            <button
              className={`px-8 py-3 rounded-full font-mono text-sm transition-all flex items-center gap-2 ${
                selectedOption
                  ? 'bg-[var(--accent-gold)] text-[#1a1510] hover:bg-[var(--accent-gold-dim)] hover:text-white font-medium shadow-[var(--shadow-glow)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-50 cursor-not-allowed border border-[var(--border-default)]'
              }`}
              onClick={handleSubmitAnswer}
              disabled={!selectedOption}
            >
              Submit <Check size={16} />
            </button>
          ) : (
             <motion.button
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="px-8 py-3 bg-[var(--text-primary)] text-[#1a1510] rounded-full font-mono text-sm transition-all flex items-center gap-2 font-medium"
               onClick={handleNextQuestion}
             >
               {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'} <ArrowRight size={16} />
             </motion.button>
          )}
        </div>
      </div>
    );
  }

  // View: Setup / Landing
  const selectedDeckCount = selectedDeck ? (deckCardCounts[selectedDeck.id] || 0) : 0;
  const isDeckValid = selectedDeckCount >= 4;

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-8 flex items-center gap-3">
        <CheckSquare className="text-[var(--accent-gold)]" size={32} strokeWidth={1.5} />
        <h1 className="text-3xl font-serif font-semibold text-[var(--text-primary)]">Quiz</h1>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">

        {/* Left Column: Start Quiz */}
        <div className="bg-[var(--bg-surface)] p-8 border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-card)] flex flex-col">
          <h2 className="text-xl font-serif text-[var(--text-primary)] mb-6">Start a Quiz</h2>

          <div className="flex-1">
            <label className="block text-sm font-mono text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Select Deck</label>
            <div className="space-y-2 mb-6">
              {decks.length === 0 && <p className="text-sm font-mono text-[var(--text-muted)]">No decks available. Create one in Flashcards.</p>}
              {decks.map(d => (
                <button
                  key={d.id}
                  className={`w-full text-left p-4 rounded-xl border font-mono text-sm flex justify-between items-center transition-all ${
                    selectedDeck?.id === d.id
                      ? 'border-[var(--accent-gold)] bg-[var(--bg-elevated)] text-[var(--accent-gold)] shadow-[var(--shadow-glow)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:border-[var(--border-active)]'
                  }`}
                  onClick={() => setSelectedDeck(d)}
                >
                  <span>{d.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{deckCardCounts[d.id] || 0} cards</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--border-subtle)] pt-6 flex flex-col gap-3">
            {selectedDeck && !isDeckValid && (
              <p className="text-xs font-mono text-[var(--accent-ember)] bg-[var(--accent-ember)]/10 p-3 rounded-lg border border-[var(--accent-ember)]/20">
                Add at least {4 - selectedDeckCount} more card{4 - selectedDeckCount > 1 ? 's' : ''} to this deck to generate a quiz.
              </p>
            )}
            <button
              className={`w-full py-4 rounded-xl font-mono text-lg transition-all flex items-center justify-center gap-2 ${
                selectedDeck && isDeckValid
                  ? 'bg-[var(--accent-gold)] text-[#1a1510] hover:bg-[var(--accent-gold-dim)] hover:text-white font-medium shadow-[var(--shadow-glow)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-50 cursor-not-allowed border border-[var(--border-default)]'
              }`}
              onClick={startQuiz}
              disabled={!selectedDeck || !isDeckValid}
            >
              Start Quiz <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="bg-[var(--bg-surface)] p-8 border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-card)] flex flex-col">
          <h2 className="text-xl font-serif text-[var(--text-primary)] mb-6">Recent Results</h2>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {history.map(h => {
              const dName = decks.find(d => d.id === h.deck_id)?.name || "Unknown Deck";
              const percent = Math.round((h.score / h.total) * 100);
              return (
                <div key={h.id} className="flex justify-between items-center p-4 border border-[var(--border-default)] rounded-xl bg-[var(--bg-base)] hover:border-[var(--border-subtle)] transition-colors">
                  <div>
                    <div className="font-mono font-medium text-[var(--text-primary)] mb-1">{dName}</div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      {new Date(h.taken_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={`font-serif text-2xl ${percent >= 80 ? 'text-[var(--accent-moss)]' : percent >= 60 ? 'text-[var(--accent-gold)]' : 'text-[var(--accent-ember)]'}`}>
                      {percent}%
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                      {h.score}/{h.total}
                    </div>
                  </div>
                </div>
              );
            })}
            {history.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                 <CheckSquare size={40} className="mb-4" />
                 <p className="font-mono text-sm">No quizzes taken yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}