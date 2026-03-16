use tauri::command;
use std::fs;
use std::path::Path;

#[command]
pub fn read_note(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[command]
pub fn write_note(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[command]
pub fn delete_note(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[command]
pub fn list_notes(dir: String) -> Result<Vec<String>, String> {
    let mut notes = Vec::new();
    fn visit_dirs(dir: &Path, notes: &mut Vec<String>) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    visit_dirs(&path, notes)?;
                } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                    if let Some(path_str) = path.to_str() {
                        notes.push(path_str.to_string());
                    }
                }
            }
        }
        Ok(())
    }

    visit_dirs(Path::new(&dir), &mut notes).map_err(|e| e.to_string())?;
    Ok(notes)
}

#[derive(serde::Serialize)]
pub struct SearchResult {
    pub path: String,
    pub content: String, // Or a snippet
}

#[command]
pub fn search_notes(dir: String, query: String) -> Result<Vec<SearchResult>, String> {
    let mut results = Vec::new();
    let query = query.to_lowercase();

    fn search_dirs(dir: &Path, query: &str, results: &mut Vec<SearchResult>) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    search_dirs(&path, query, results)?;
                } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if content.to_lowercase().contains(query) {
                            if let Some(path_str) = path.to_str() {
                                results.push(SearchResult {
                                    path: path_str.to_string(),
                                    content: content.chars().take(200).collect(),
                                });
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    search_dirs(Path::new(&dir), &query, &mut results).map_err(|e| e.to_string())?;
    Ok(results)
}