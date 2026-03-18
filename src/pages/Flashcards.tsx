import { useState, useEffect } from "react";
import { useAppStore } from "../lib/store";
import { generateFlashcards } from "../lib/ai";
import {
  Deck, Card, listDecks, createDeck, deleteDeck,
  listCards, createCard, deleteCard, getDueCards, updateCardSM2
} from "../lib/db";
import { calculateSM2 } from "../lib/sm2";
import { toast } from "../lib/toastStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Brain, CheckCircle, Plus } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

export default function Flashcards() {
  const store = useAppStore();
  const [decks, setDecks] = useState<(Deck & { total: number; due: number; mastery: number })[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);

  const [newDeckName, setNewDeckName] = useState("");
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  const [reviewMode, setReviewMode] = useState(false);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [showComplete, setShowComplete] = useState(false);

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPreviewCards, setAiPreviewCards] = useState<{ front: string; back: string }[]>([]);

  const [deckToDelete, setDeckToDelete] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    setIsLoading(true);
    try {
      const d = await listDecks();
      const decksWithStats = await Promise.all(d.map(async (deck) => {
        const c = await listCards(deck.id);
        const due = await getDueCards(deck.id);
        const masteryCards = c.filter(card => card.interval > 21);
        const mastery = c.length > 0 ? Math.round((masteryCards.length / c.length) * 100) : 0;
        return { ...deck, total: c.length, due: due.length, mastery };
      }));
      setDecks(decksWithStats);
    } catch (e) {
      console.error(e);
      toast("Failed to load decks.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCards = async (deckId: number) => {
    setCardsLoading(true);
    try {
      const c = await listCards(deckId);
      setCards(c);
    } catch (e) {
      console.error(e);
      toast("Failed to load cards.", "error");
    } finally {
      setCardsLoading(false);
    }
  };

  const handleCreateDeck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDeckName.trim()) return;
    try {
      await createDeck(newDeckName.trim());
      setNewDeckName("");
      toast("Deck created.", "success");
      loadDecks();
    } catch (e) {
      console.error(e);
      toast("Failed to create deck.", "error");
    }
  };

  const requestDeleteDeck = (id: number) => {
    setDeckToDelete(id);
  };

  const confirmDeleteDeck = async () => {
    if (deckToDelete === null) return;
    try {
      await deleteDeck(deckToDelete);
      if (selectedDeck?.id === deckToDelete) {
        setSelectedDeck(null);
        setCards([]);
      }
      toast("Deck deleted.", "info");
      loadDecks();
    } catch (e) {
      console.error(e);
      toast("Failed to delete deck.", "error");
    } finally {
      setDeckToDelete(null);
    }
  };

  const handleCreateCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDeck || !newCardFront.trim() || !newCardBack.trim()) return;
    try {
      await createCard(selectedDeck.id, newCardFront.trim(), newCardBack.trim());
      setNewCardFront("");
      setNewCardBack("");
      toast("Card added.", "success");
      loadCards(selectedDeck.id);
      loadDecks(); // Update stats
    } catch (e) {
      console.error(e);
      toast("Failed to add card.", "error");
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (!selectedDeck) return;
    try {
      await deleteCard(id);
      loadCards(selectedDeck.id);
      loadDecks(); // Update stats
      toast("Card deleted.", "info");
    } catch (e) {
      console.error(e);
      toast("Failed to delete card.", "error");
    }
  };

  const handleStartReview = async () => {
    if (!selectedDeck) return;
    try {
      const due = await getDueCards(selectedDeck.id);
      if (due.length === 0) {
        toast("No cards due for review today!", "info");
        return;
      }
      setDueCards(due);
      setCurrentReviewIndex(0);
      setShowBack(false);
      setReviewMode(true);
      setShowComplete(false);
      setSessionStats({ reviewed: 0, correct: 0 });
    } catch (e) {
      console.error(e);
      toast("Failed to start review.", "error");
    }
  };

  const handleReviewAnswer = async (rating: number) => {
    const card = dueCards[currentReviewIndex];
    try {
      const sm2Result = calculateSM2(rating, card.ease_factor, card.interval);
      await updateCardSM2(card.id, sm2Result.easeFactor, sm2Result.interval, sm2Result.dueDate);

      const isCorrect = rating >= 3;
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (isCorrect ? 1 : 0)
      }));

      if (currentReviewIndex < dueCards.length - 1) {
        setCurrentReviewIndex(currentReviewIndex + 1);
        setShowBack(false);
      } else {
        setReviewMode(false);
        setShowComplete(true);
        loadCards(selectedDeck!.id);
        loadDecks(); // update stats
      }
    } catch (e) {
      console.error(e);
      toast("Failed to save review.", "error");
    }
  };

  const handleGenerateAI = async () => {
    if (!store.geminiApiKey) {
      toast("Please set your Gemini API key in Settings first.", "warning");
      return;
    }
    if (!aiInputText.trim()) {
      toast("Please paste some text to generate cards from.", "warning");
      return;
    }

    setIsGenerating(true);
    setAiPreviewCards([]);
    try {
      const result = await generateFlashcards(store.geminiApiKey, aiInputText);
      if (result) {
        setAiPreviewCards(result);
        toast(`Generated ${result.length} cards! Review and confirm.`, "success");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAI = async () => {
    if (!selectedDeck || aiPreviewCards.length === 0) return;
    setIsGenerating(true);
    try {
      for (const c of aiPreviewCards) {
        await createCard(selectedDeck.id, c.front, c.back);
      }
      toast(`Successfully added ${aiPreviewCards.length} cards to deck.`, "success");
      setAiPanelOpen(false);
      setAiInputText("");
      setAiPreviewCards([]);
      loadCards(selectedDeck.id);
      loadDecks();
    } catch (e) {
      console.error(e);
      toast("Failed to save AI generated cards.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Rendering functions for states
  const renderCompleteScreen = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 rounded-full bg-[var(--accent-moss)]/20 flex items-center justify-center mb-8">
        <CheckCircle className="text-[var(--accent-moss)]" size={48} />
      </div>
      <h2 className="text-4xl font-serif text-[var(--text-primary)] mb-2">Session Complete</h2>
      <p className="text-[var(--text-secondary)] font-mono mb-12">Great work. Your brain is a little stronger now.</p>

      <div className="flex gap-8 mb-12">
        <div className="text-center">
          <div className="text-3xl font-serif text-[var(--text-primary)]">{sessionStats.reviewed}</div>
          <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest mt-2">Cards Reviewed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-serif text-[var(--text-primary)]">
            {Math.round((sessionStats.correct / Math.max(sessionStats.reviewed, 1)) * 100)}%
          </div>
          <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest mt-2">Accuracy</div>
        </div>
      </div>

      <button
        className="px-8 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-full font-mono text-sm hover:border-[var(--accent-gold)] text-[var(--text-primary)] transition-all hover:scale-105"
        onClick={() => setShowComplete(false)}
      >
        Back to Deck
      </button>
    </div>
  );

  const renderStudySession = () => {
    const card = dueCards[currentReviewIndex];
    if (!card) return null;

    // Use DOMPurify and marked for rich text
    const renderMarkdown = (text: string) => {
      // In a real app we'd await marked.parse, but marked is sync by default if no async extensions are used.
      const html = marked.parse(text, { async: false }) as string;
      return { __html: DOMPurify.sanitize(html) };
    };

    return (
      <div className="flex flex-col items-center h-full w-full p-8 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--bg-elevated)]">
          <div
            className="h-full bg-[var(--accent-gold)] transition-all duration-300"
            style={{ width: `${(currentReviewIndex / dueCards.length) * 100}%` }}
          />
        </div>

        <div className="w-full max-w-2xl flex justify-between items-center mb-8 mt-4">
          <div className="text-sm font-mono text-[var(--text-muted)]">
            Reviewing: <span className="text-[var(--text-primary)]">{selectedDeck?.name}</span>
          </div>
          <div className="text-sm font-mono text-[var(--text-muted)]">
            {currentReviewIndex + 1} / {dueCards.length}
          </div>
        </div>

        {/* 3D Flip Card */}
        <div className="relative w-full max-w-2xl h-[400px] perspective-1000">
          <motion.div
            className="w-full h-full relative preserve-3d cursor-pointer"
            animate={{ rotateY: showBack ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
            onClick={() => !showBack && setShowBack(true)}
          >
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-card)] p-10 flex flex-col justify-center items-center text-center">
              <h3 className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest absolute top-6 left-6">Question</h3>
              <div className="text-2xl font-serif text-[var(--text-primary)] leading-relaxed">
                {card.front}
              </div>
              {!showBack && (
                <div className="absolute bottom-6 text-xs font-mono text-[var(--text-muted)] opacity-50 animate-pulse">
                  Click to reveal answer
                </div>
              )}
            </div>

            {/* Back */}
            <div
              className="absolute w-full h-full backface-hidden bg-[var(--bg-elevated)] border border-[var(--border-active)] rounded-2xl shadow-[var(--shadow-glow)] p-10 flex flex-col pt-16"
              style={{ transform: "rotateY(180deg)" }}
            >
              <h3 className="text-xs font-mono text-[var(--accent-gold)] uppercase tracking-widest absolute top-6 left-6">Answer</h3>
              <div
                className="flex-1 overflow-y-auto prose prose-invert prose-p:text-[var(--text-primary)] prose-a:text-[var(--accent-gold)] max-w-none font-sans text-base leading-relaxed custom-scrollbar"
                dangerouslySetInnerHTML={renderMarkdown(card.back)}
              />
            </div>
          </motion.div>
        </div>

        {/* Rating Buttons */}
        <div className="mt-12 h-16 w-full max-w-2xl">
          <AnimatePresence>
            {showBack && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between gap-4"
              >
                <button
                  className="flex-1 py-3 bg-[var(--bg-surface)] border border-[var(--accent-ember)] text-[var(--accent-ember)] rounded-full font-mono text-sm hover:bg-[var(--accent-ember)] hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleReviewAnswer(1); }}
                >
                  Again <span className="text-[10px] opacity-70 ml-1">&lt; 1m</span>
                </button>
                <button
                  className="flex-1 py-3 bg-[var(--bg-surface)] border border-orange-500/50 text-orange-400 rounded-full font-mono text-sm hover:bg-orange-500 hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleReviewAnswer(2); }}
                >
                  Hard <span className="text-[10px] opacity-70 ml-1">~1d</span>
                </button>
                <button
                  className="flex-1 py-3 bg-[var(--bg-surface)] border border-[var(--accent-moss)] text-[var(--accent-moss)] rounded-full font-mono text-sm hover:bg-[var(--accent-moss)] hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleReviewAnswer(3); }}
                >
                  Good <span className="text-[10px] opacity-70 ml-1">~2d</span>
                </button>
                <button
                  className="flex-1 py-3 bg-[var(--bg-surface)] border border-blue-500/50 text-blue-400 rounded-full font-mono text-sm hover:bg-blue-600 hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleReviewAnswer(4); }}
                >
                  Easy <span className="text-[10px] opacity-70 ml-1">~4d</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  if (showComplete) return renderCompleteScreen();
  if (reviewMode) return renderStudySession();

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Deck List Sidebar */}
      <div className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] flex flex-col shrink-0">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <Layers className="text-[var(--accent-gold)]" size={20} />
          <h2 className="font-serif font-semibold text-lg text-[var(--text-primary)]">Decks</h2>
        </div>

        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <form onSubmit={handleCreateDeck} className="flex gap-2">
            <input
              className="flex-1 px-3 py-1.5 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] focus:outline-none focus:border-[var(--border-active)] font-mono text-xs text-[var(--text-primary)]"
              placeholder="New deck name..."
              value={newDeckName}
              onChange={e => setNewDeckName(e.target.value)}
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-md hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-colors flex items-center justify-center"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 space-y-4">
               <Loader className="h-12 w-full" />
               <Loader className="h-12 w-full" />
               <Loader className="h-12 w-full" />
            </div>
          ) : (
            decks.map(deck => (
              <div
                key={deck.id}
                className={`group relative p-3 rounded-lg cursor-pointer flex flex-col gap-1 transition-all ${
                  selectedDeck?.id === deck.id
                    ? 'bg-[var(--bg-elevated)] border-l-2 border-l-[var(--accent-gold)]'
                    : 'hover:bg-[var(--bg-hover)] border-l-2 border-l-transparent'
                }`}
                onClick={() => {
                  setSelectedDeck(deck);
                  loadCards(deck.id);
                }}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-sm text-[var(--text-primary)] truncate pr-4">{deck.name}</span>
                  <button
                    className="absolute right-2 top-2 text-[var(--text-muted)] hover:text-[var(--accent-ember)] opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); requestDeleteDeck(deck.id); }}
                    title="Delete Deck"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-end text-[10px] font-mono text-[var(--text-muted)]">
                  <span>{deck.total} cards</span>
                  {deck.due > 0 && (
                    <span className="text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-1.5 py-0.5 rounded">
                      {deck.due} due
                    </span>
                  )}
                </div>
                {/* Mastery badge */}
                {deck.total > 0 && (
                  <div className="absolute right-2 bottom-2 text-[8px] font-mono font-medium tracking-wider text-[var(--accent-moss)] uppercase">
                    {deck.mastery}% Mast.
                  </div>
                )}
              </div>
            ))
          )}
          {!isLoading && decks.length === 0 && (
            <div className="text-center p-4 font-mono text-xs text-[var(--text-muted)]">
              No decks yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <Modal isOpen={deckToDelete !== null} onClose={() => setDeckToDelete(null)} title="Delete Deck">
        <p className="text-sm font-mono mb-6">Are you sure you want to delete this deck? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            onClick={() => setDeckToDelete(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-[var(--accent-ember)] text-white rounded-md font-mono text-sm font-medium hover:bg-red-600 transition-colors"
            onClick={confirmDeleteDeck}
          >
            Delete
          </button>
        </div>
      </Modal>

      <div className="flex-1 flex flex-col bg-[var(--bg-surface)] overflow-hidden relative">
        {selectedDeck ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-base)]">
              <div>
                <h2 className="text-2xl font-serif text-[var(--text-primary)] mb-1">{selectedDeck.name}</h2>
                <div className="text-xs font-mono text-[var(--text-muted)]">
                  {cards.length} total cards • {decks.find(d => d.id === selectedDeck.id)?.mastery || 0}% mastery
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono text-sm rounded-md hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors flex items-center gap-2"
                  onClick={() => setAiPanelOpen(true)}
                >
                  <Brain size={16} /> Generate AI
                </button>
                <button
                  className={`px-6 py-2 font-mono text-sm rounded-md flex items-center gap-2 transition-colors ${
                    (decks.find(d => d.id === selectedDeck.id)?.due || 0) > 0
                      ? 'bg-[var(--accent-gold)] text-[#1a1510] hover:bg-[var(--accent-gold-dim)] hover:text-white'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-default)]'
                  }`}
                  onClick={handleStartReview}
                  disabled={(decks.find(d => d.id === selectedDeck.id)?.due || 0) === 0}
                >
                  <PlayIcon className="w-4 h-4" /> Study {(decks.find(d => d.id === selectedDeck.id)?.due || 0) > 0 ? `(${decks.find(d => d.id === selectedDeck.id)?.due})` : ''}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">

              {/* Add Manual Card Form */}
              <form onSubmit={handleCreateCard} className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-4">Add Manual Card</h3>
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-xs font-mono text-[var(--text-muted)] mb-2 uppercase tracking-wide">Front (Question)</label>
                    <textarea
                      className="w-full px-4 py-3 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] resize-none h-24 focus:outline-none focus:border-[var(--border-active)] font-sans text-sm custom-scrollbar"
                      value={newCardFront}
                      onChange={e => setNewCardFront(e.target.value)}
                      placeholder="e.g. What is the capital of France?"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[var(--text-muted)] mb-2 uppercase tracking-wide">Back (Answer - Markdown supported)</label>
                    <textarea
                      className="w-full px-4 py-3 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] resize-none h-24 focus:outline-none focus:border-[var(--border-active)] font-mono text-sm custom-scrollbar"
                      value={newCardBack}
                      onChange={e => setNewCardBack(e.target.value)}
                      placeholder="e.g. **Paris** is the capital."
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-md font-mono text-sm hover:border-[var(--accent-gold)] transition-colors"
                  >
                    Add Card
                  </button>
                </div>
              </form>

              {/* Card List */}
              <div className="space-y-4 pb-12">
                <h3 className="text-sm font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-4">Deck Cards</h3>
                {cardsLoading ? (
                  <Loader className="h-32 w-full" />
                ) : cards.length > 0 ? (
                  cards.map(card => (
                    <div key={card.id} className="group p-5 border border-[var(--border-default)] rounded-xl bg-[var(--bg-base)] flex gap-6 hover:border-[var(--border-subtle)] transition-colors">
                      <div className="flex-1 w-1/2">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1 block">Front</span>
                        <p className="font-sans text-sm text-[var(--text-primary)] whitespace-pre-wrap">{card.front}</p>
                      </div>
                      <div className="w-px bg-[var(--border-subtle)]" />
                      <div className="flex-1 w-1/2">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1 block">Back</span>
                        <p className="font-mono text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words truncate max-h-24">{card.back}</p>
                      </div>
                      <div className="flex flex-col justify-between items-end pl-4 border-l border-[var(--border-subtle)] min-w-[100px]">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-1 rounded">
                          Due: {new Date(card.due_date).toLocaleDateString()}
                        </span>
                        <button
                          className="text-[var(--text-muted)] hover:text-[var(--accent-ember)] text-xs font-mono px-2 py-1 transition-colors opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteCard(card.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-12 border border-dashed border-[var(--border-default)] rounded-xl">
                    <p className="font-mono text-[var(--text-muted)]">No cards in this deck.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] p-8 text-center bg-[var(--bg-base)]">
            <Layers size={48} className="mb-4 opacity-20" />
            <h2 className="text-xl font-serif text-[var(--text-primary)] mb-2">Select a Deck</h2>
            <p className="font-mono text-sm">Choose a deck from the sidebar to view its cards or start a study session.</p>
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
                <h3 className="font-serif text-lg text-[var(--text-primary)] flex items-center gap-2"><Brain size={18} className="text-[var(--accent-gold)]"/> AI Generation</h3>
                <button onClick={() => setAiPanelOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-4">
                {aiPreviewCards.length === 0 ? (
                  <>
                    <p className="text-xs font-mono text-[var(--text-secondary)] leading-relaxed">
                      Paste your study material below. Gemini will automatically extract key facts and generate concise flashcards.
                    </p>
                    <textarea
                      className="flex-1 w-full px-4 py-3 border border-[var(--border-default)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--border-active)] font-sans text-sm custom-scrollbar"
                      placeholder="Paste lecture notes, book excerpts, etc..."
                      value={aiInputText}
                      onChange={e => setAiInputText(e.target.value)}
                    />
                    <button
                      className="w-full py-3 bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-md font-mono text-sm hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                    >
                      {isGenerating ? <><Loader className="w-4 h-4 bg-transparent"/> Generating...</> : 'Generate Cards'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest">Preview ({aiPreviewCards.length} cards)</span>
                      <button
                        className="text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                        onClick={() => setAiPreviewCards([])}
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                      {aiPreviewCards.map((c, i) => (
                        <div key={i} className="p-3 border border-[var(--border-default)] rounded-lg bg-[var(--bg-base)]">
                          <input
                            className="w-full bg-transparent border-b border-[var(--border-subtle)] text-sm font-sans text-[var(--text-primary)] mb-2 pb-1 focus:outline-none focus:border-[var(--accent-gold)]"
                            value={c.front}
                            onChange={(e) => {
                              const newCards = [...aiPreviewCards];
                              newCards[i].front = e.target.value;
                              setAiPreviewCards(newCards);
                            }}
                          />
                          <textarea
                            className="w-full bg-transparent text-sm font-mono text-[var(--text-secondary)] resize-none h-16 focus:outline-none focus:text-[var(--text-primary)] custom-scrollbar"
                            value={c.back}
                            onChange={(e) => {
                              const newCards = [...aiPreviewCards];
                              newCards[i].back = e.target.value;
                              setAiPreviewCards(newCards);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      className="w-full py-3 bg-[var(--accent-gold)] text-[#1a1510] font-mono font-medium rounded-md hover:bg-[var(--accent-gold-dim)] hover:text-white transition-colors disabled:opacity-50 mt-2"
                      onClick={handleConfirmAI}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Saving...' : 'Add to Deck'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Simple icon wrapper
function PlayIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );
}