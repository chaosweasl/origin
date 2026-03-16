mod commands;

use commands::focus::{set_wallpaper, get_current_wallpaper, set_dnd, suspend_app, resume_app};
use commands::fs::{read_note, write_note, delete_note, list_notes, search_notes};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
            CREATE TABLE IF NOT EXISTS decks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deck_id INTEGER NOT NULL,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                ease_factor REAL DEFAULT 2.5,
                interval INTEGER DEFAULT 0,
                due_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deck_id INTEGER NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS focus_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                duration_minutes INTEGER
            );
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:app.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_wallpaper,
            get_current_wallpaper,
            set_dnd,
            suspend_app,
            resume_app,
            read_note,
            write_note,
            delete_note,
            list_notes,
            search_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}