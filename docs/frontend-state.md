# Frontend Design & Current Application State

This document outlines the overall frontend architecture of Student OS, the features that are functional, and the features that currently require manual input, configuration, or are mock/non-functional due to OS-level or environment constraints.

## Overall Frontend Architecture

The frontend is built as a Single Page Application (SPA) using React 19, TypeScript, and Vite.
- **Routing:** Handled via `react-router-dom`, with a persistent sidebar shell (`App.tsx`) wrapping all main views (Dashboard, Flashcards, Quiz, Journal, Cheatsheets, Settings). The Focus Mode is rendered as a separate full-screen route (`/focus`) outside the main shell to guarantee an immersive experience.
- **State Management:** `zustand` is used for global state (Theme, Focus configurations, API keys, Vault Path). This state is automatically persisted to disk using `@tauri-apps/plugin-store` via a custom `loadStore()` hook initialized at app startup.
- **Styling:** Uses Tailwind CSS v4 for rapid, utility-first styling. The dark/light theme is toggled by dynamically adding/removing the `dark` class on the `<html>` root element.
- **Database Access:** All complex structured data (Decks, Cards, Session History) is managed through standard SQL queries executed via `@tauri-apps/plugin-sql` mapping to a local `app.db` file.
- **File System Access:** Markdown notes and cheatsheets are read and written using custom Rust commands (`invoke("read_note")`) rather than standard Web APIs, bypassing browser sandbox restrictions to write directly to the user's OS filesystem.

---

## Feature Status & Manual Configuration Requirements

Because Student OS relies heavily on native Windows APIs and external AI models, several features require explicit manual setup by the user before they can be used.

### 1. Settings & Prerequisites (Required First Steps)
Out of the box, several core pages will appear blank or prompt for configuration. **You must visit the Settings page first:**
- **Journal Vault Folder Path:** Must be set to an absolute, existing Windows directory path (e.g., `C:\Users\Name\Documents\StudentOS_Vault`). If this folder does not exist, or the path is empty, the Journal and Cheatsheet pages will fail to load or save files.
- **Anthropic API Key:** Must be provided to use the "Generate with AI" buttons in the Flashcards and Cheatsheets pages. If empty, the feature will alert the user and fail.

### 2. Focus Mode (OS Hooks & Limitations)
The Focus Mode timer and audio playback are fully functional within the React frontend, but the underlying OS hooks are highly dependent on the Windows environment:
- **Audio Playback:** Relies on the Tauri asset protocol (`asset://localhost/`). You must provide an absolute path to a valid `.mp3` or `.ogg` file in Settings. Browsers often block autoplaying audio without prior interaction, though the "Start" button click usually satisfies this requirement.
- **App Blocking (Suspension):** The Rust backend uses `sysinfo` and the `windows` crate to aggressively suspend process threads. You must provide exact process names (e.g., `Discord`, `Spotify`) in the settings. **Warning:** Suspending critical system processes or processes with slightly different names (e.g., `Discord.exe` vs `Discord`) may fail or cause system instability.
- **Do Not Disturb (DND):** Toggles Windows Focus Assist by executing a PowerShell script to modify the registry. Depending on the user's Windows version (Windows 10 vs 11) and execution policies, this PowerShell command might silently fail or be blocked by Windows Defender.
- **Wallpaper Changer:** Uses the `wallpaper` crate. If the provided path in Settings is invalid, the fallback/restore mechanism might fail, leaving the user with the temporary wallpaper permanently.

### 3. Flashcards & Quizzes
- **Manual Data Entry:** Creating a deck and adding cards manually works. However, the UI for adding a card is barebones (two textareas). There is no rich text formatting for flashcards.
- **AI Generation:** The AI generation relies on a raw `prompt()` dialog where the user pastes text. The app then sends this to the Anthropic API expecting a strict JSON array. If the AI model hallucinates markdown formatting or conversational text outside the JSON array, the `JSON.parse()` step will throw an error and fail to generate the cards.
- **Quizzes:** The Quiz generator requires **at least 4 cards** to exist in the selected deck to generate multiple-choice options (1 correct, 3 random wrong options). If a deck has fewer than 4 cards, the quiz cannot be started.

### 4. Journal & Cheatsheets
- **File Creation:** When creating a new note, the app prompts for a filename. If the user inputs invalid characters for a Windows filename (e.g., `\`, `/`, `:`, `*`, `?`, `"`, `<`, `>`, `|`), the Rust `fs::write` command will fail silently or throw an unhandled error.
- **Wikilinks:** The parsing of `[[wikilink]]` is superficial. It uses a regex to find links and renders them as clickable elements at the bottom of the editor. Clicking a link attempts to load the exact string as `.md` from the Vault path. It does not handle nested folders or complex path resolutions.
- **Cheatsheet Markdown Rendering:** The Cheatsheet page attempts to render two-column markdown tables dynamically by splitting the text by newline and `|` characters. This is a very brittle parser and will break visually if the AI generates complex markdown tables, nested tables, or includes standard conversational text before the table.