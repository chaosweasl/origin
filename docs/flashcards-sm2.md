# Flashcards (SM-2)

Student OS implements a basic spaced-repetition algorithm based on SuperMemo-2 (SM-2).

## Data Structure

Flashcards are organized into decks within the local SQLite `app.db`.
The core attributes of a flashcard are:
- `front` and `back`
- `deck_id`
- `ease_factor` (default: 2.5)
- `interval` (in days, default: 0)
- `due_date` (default: current timestamp)

## Algorithm implementation

The SM-2 algorithm evaluates user ratings (1-4) on flashcards to compute their next scheduled review time, adapting dynamically to the user's recall difficulty.

**Ratings:**
- 1: Again (Incorrect)
- 2: Hard (Correct, required effort)
- 3: Good (Correct, standard recall)
- 4: Easy (Correct, instantaneous recall)

**Calculations (`src/lib/sm2.ts`):**
1. Ratings are mapped to a 0-5 quality score.
2. If quality < 3 (Wrong), the `interval` resets to 1 day.
3. If quality >= 3 (Correct):
   - First correct review: interval = 1
   - Second correct review: interval = 6
   - Subsequent reviews: interval = interval * `ease_factor`
4. `ease_factor` is dynamically adjusted to decrease for hard cards and increase for easy cards (minimum floor of 1.3).
5. The `due_date` is updated by adding the new `interval` to the current date.

When a card is reviewed, the corresponding SQLite record is updated with the returned `ease_factor`, `interval`, and `due_date`.