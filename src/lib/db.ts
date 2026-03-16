import Database from '@tauri-apps/plugin-sql';

export interface Deck {
  id: number;
  name: string;
  created_at: string;
}

export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  ease_factor: number;
  interval: number;
  due_date: string;
}

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:app.db');
  }
  return dbInstance;
}

export async function createDeck(name: string): Promise<void> {
  const db = await getDb();
  await db.execute('INSERT INTO decks (name) VALUES ($1)', [name]);
}

export async function listDecks(): Promise<Deck[]> {
  const db = await getDb();
  return db.select<Deck[]>('SELECT * FROM decks ORDER BY created_at DESC');
}

export async function renameDeck(id: number, newName: string): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE decks SET name = $1 WHERE id = $2', [newName, id]);
}

export async function deleteDeck(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM decks WHERE id = $1', [id]);
}

export async function createCard(deck_id: number, front: string, back: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO cards (deck_id, front, back, ease_factor, interval, due_date) VALUES ($1, $2, $3, 2.5, 0, datetime("now"))',
    [deck_id, front, back]
  );
}

export async function listCards(deck_id: number): Promise<Card[]> {
  const db = await getDb();
  return db.select<Card[]>('SELECT * FROM cards WHERE deck_id = $1', [deck_id]);
}

export async function updateCardSM2(id: number, ease_factor: number, interval: number, due_date: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE cards SET ease_factor = $1, interval = $2, due_date = $3 WHERE id = $4',
    [ease_factor, interval, due_date, id]
  );
}

export async function deleteCard(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM cards WHERE id = $1', [id]);
}

export async function getDueCards(deck_id: number): Promise<Card[]> {
  const db = await getDb();
  return db.select<Card[]>(
    'SELECT * FROM cards WHERE deck_id = $1 AND due_date <= datetime("now") ORDER BY due_date ASC',
    [deck_id]
  );
}

export interface QuizSession {
  id: number;
  deck_id: number;
  score: number;
  total: number;
  taken_at: string;
}

export async function createQuizSession(deck_id: number, score: number, total: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO quiz_sessions (deck_id, score, total) VALUES ($1, $2, $3)',
    [deck_id, score, total]
  );
}

export async function listQuizSessions(): Promise<QuizSession[]> {
  const db = await getDb();
  return db.select<QuizSession[]>('SELECT * FROM quiz_sessions ORDER BY taken_at DESC');
}

export interface FocusSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

export async function createFocusSession(): Promise<number> {
  const db = await getDb();
  const res = await db.execute('INSERT INTO focus_sessions (started_at) VALUES (datetime("now"))');
  return res.lastInsertId as number;
}

export async function finishFocusSession(id: number, duration_minutes: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE focus_sessions SET ended_at = datetime("now"), duration_minutes = $1 WHERE id = $2',
    [duration_minutes, id]
  );
}

export async function listFocusSessions(): Promise<FocusSession[]> {
  const db = await getDb();
  return db.select<FocusSession[]>('SELECT * FROM focus_sessions ORDER BY started_at DESC');
}