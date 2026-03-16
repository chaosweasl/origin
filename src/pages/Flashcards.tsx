import { useState, useEffect } from "react";
import {
  Deck, Card, listDecks, createDeck, deleteDeck,
  listCards, createCard, deleteCard, getDueCards, updateCardSM2
} from "../lib/db";
import { useAppStore } from "../lib/store";
import { calculateSM2 } from "../lib/sm2";

export default function Flashcards() {
  const store = useAppStore();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);

  const [newDeckName, setNewDeckName] = useState("");
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  const [reviewMode, setReviewMode] = useState(false);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadDecks = async () => {
    const d = await listDecks();
    setDecks(d);
  };

  const loadCards = async (deckId: number) => {
    const c = await listCards(deckId);
    setCards(c);
  };

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    if (selectedDeck) {
      loadCards(selectedDeck.id);
    } else {
      setCards([]);
    }
  }, [selectedDeck]);

  const handleCreateDeck = async () => {
    if (!newDeckName) return;
    await createDeck(newDeckName);
    setNewDeckName("");
    loadDecks();
  };

  const handleDeleteDeck = async (id: number) => {
    await deleteDeck(id);
    if (selectedDeck?.id === id) setSelectedDeck(null);
    loadDecks();
  };

  const handleCreateCard = async () => {
    if (!selectedDeck || !newCardFront || !newCardBack) return;
    await createCard(selectedDeck.id, newCardFront, newCardBack);
    setNewCardFront("");
    setNewCardBack("");
    loadCards(selectedDeck.id);
  };

  const handleDeleteCard = async (id: number) => {
    if (!selectedDeck) return;
    await deleteCard(id);
    loadCards(selectedDeck.id);
  };

  const handleStartReview = async () => {
    if (!selectedDeck) return;
    const due = await getDueCards(selectedDeck.id);
    setDueCards(due);
    setCurrentReviewIndex(0);
    setShowBack(false);
    setReviewMode(true);
  };

  const handleReviewAnswer = async (rating: number) => {
    const card = dueCards[currentReviewIndex];
    const sm2Result = calculateSM2(rating, card.ease_factor, card.interval);
    await updateCardSM2(card.id, sm2Result.easeFactor, sm2Result.interval, sm2Result.dueDate);

    if (currentReviewIndex < dueCards.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
      setShowBack(false);
    } else {
      setReviewMode(false);
      loadCards(selectedDeck!.id);
      alert("Review complete!");
    }
  };

  const handleGenerateAI = async () => {
    if (!store.anthropicApiKey) {
      alert("Please set your Anthropic API key in Settings first.");
      return;
    }
    const text = prompt("Paste text to generate flashcards from:");
    if (!text) return;

    setIsGenerating(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": store.anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Generate flashcards from the following text. Return ONLY a valid JSON array of objects, each with a "front" and "back" property, and no other text or markdown wrappers.\n\nText: ${text}`
          }]
        })
      });

      const data = await response.json();
      if (data.content && data.content[0] && data.content[0].text) {
        const jsonStr = data.content[0].text.trim().replace(/```json/g, "").replace(/```/g, "");
        const generatedCards = JSON.parse(jsonStr);
        for (const c of generatedCards) {
          await createCard(selectedDeck!.id, c.front, c.back);
        }
        loadCards(selectedDeck!.id);
        alert(`Generated ${generatedCards.length} cards successfully!`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate cards. See console.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (reviewMode && dueCards.length > 0) {
    const card = dueCards[currentReviewIndex];
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-xl mb-8">Reviewing: {selectedDeck?.name} ({currentReviewIndex + 1} / {dueCards.length})</h2>
        <div
          className="w-full max-w-2xl min-h-64 p-8 border border-border rounded-xl bg-card shadow-sm cursor-pointer flex flex-col items-center justify-center transition-all"
          onClick={() => !showBack && setShowBack(true)}
        >
          <div className="text-2xl text-center mb-6">{card.front}</div>
          {showBack ? (
            <div className="text-xl text-center text-muted-foreground pt-6 border-t border-border w-full">
              {card.back}
            </div>
          ) : (
            <div className="text-muted-foreground mt-8 text-sm italic">Click to reveal answer</div>
          )}
        </div>

        {showBack && (
          <div className="flex gap-4 mt-8">
            <button className="px-6 py-3 bg-destructive text-destructive-foreground rounded-md font-medium" onClick={() => handleReviewAnswer(1)}>Again</button>
            <button className="px-6 py-3 bg-orange-500 text-white rounded-md font-medium" onClick={() => handleReviewAnswer(2)}>Hard</button>
            <button className="px-6 py-3 bg-green-500 text-white rounded-md font-medium" onClick={() => handleReviewAnswer(3)}>Good</button>
            <button className="px-6 py-3 bg-blue-500 text-white rounded-md font-medium" onClick={() => handleReviewAnswer(4)}>Easy</button>
          </div>
        )}
      </div>
    );
  }

  if (reviewMode && dueCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-2xl font-bold mb-4">No cards due for review!</h2>
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md" onClick={() => setReviewMode(false)}>Go Back</button>
      </div>
    );
  }


  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-border p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Decks</h2>

        <div className="flex space-x-2 mb-6">
          <input
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background focus:outline-none"
            placeholder="New Deck Name"
            value={newDeckName}
            onChange={e => setNewDeckName(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={handleCreateDeck}
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {decks.map(deck => (
            <div
              key={deck.id}
              className={`p-3 rounded-md cursor-pointer flex justify-between items-center transition-colors ${selectedDeck?.id === deck.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
              onClick={() => setSelectedDeck(deck)}
            >
              <span>{deck.name}</span>
              <button
                className="text-destructive text-sm"
                onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.id); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="w-2/3 p-6 overflow-y-auto flex flex-col">
        {selectedDeck ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedDeck.name} Cards</h2>
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
                onClick={handleStartReview}
              >
                Review Due Cards
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-muted/30 rounded-lg border border-border">
              <div>
                <label className="block text-sm font-medium mb-1">Front</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none h-24"
                  value={newCardFront}
                  onChange={e => setNewCardFront(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Back</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none h-24"
                  value={newCardBack}
                  onChange={e => setNewCardBack(e.target.value)}
                />
              </div>
              <div className="col-span-2 flex justify-between">
                <button
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md border border-border"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </button>
                <button
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md"
                  onClick={handleCreateCard}
                >
                  Add Card
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {cards.map(card => (
                <div key={card.id} className="p-4 border border-border rounded-lg bg-card flex justify-between">
                  <div className="flex-1 mr-4">
                    <p className="font-medium mb-2">{card.front}</p>
                    <p className="text-muted-foreground text-sm">{card.back}</p>
                  </div>
                  <div className="flex flex-col justify-between items-end min-w-32">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Due: {new Date(card.due_date).toLocaleDateString()}
                    </span>
                    <button
                      className="text-destructive text-sm mt-4"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No cards in this deck.</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a deck to view cards.
          </div>
        )}
      </div>
    </div>
  );
}