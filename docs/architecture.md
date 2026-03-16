# Architecture

Student OS is a Windows-only desktop productivity application built using **Tauri 2**, **Rust**, and **React (TypeScript)**.

## Core Concepts
- **Tauri Shell:** The core shell providing native OS-level integration and window management.
- **Frontend:** A React + Vite + TypeScript application handling all UI logic, rendering, and API interactions.
- **State Management:** Uses `zustand` for global state (themes, settings, API keys).
- **Database:** Uses `@tauri-apps/plugin-sql` mapping to a local `app.db` SQLite database storing flashcards, decks, and session histories.
- **File System:** Uses `std::fs` (via custom Tauri commands) to read/write Markdown files in a user-designated vault directory.

## Data Flow
- **Flashcards & Quizzes:** UI interactions -> Tauri SQL plugin -> local `app.db`.
- **Journal & Cheatsheets:** UI -> Tauri Rust Commands (`read_note`, `write_note`) -> local filesystem `vault`.
- **Focus Mode:** UI -> Tauri Rust Commands (`set_dnd`, `set_wallpaper`, `suspend_app`) -> Windows OS APIs.
- **AI Integrations:** UI -> React `fetch` calls -> Anthropic API. (Does not use Rust for network calls to keep context bound to frontend).