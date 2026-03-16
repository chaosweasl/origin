# Journal

The Journal functionality allows users to write markdown notes in a user-designated file vault directory.

## Design
- File storage leverages standard standard file I/O operations (`std::fs`) in Rust to write to a designated folder on disk (`vault_path` stored via Zustand).
- All notes are purely Markdown files (`.md`).

## CodeMirror 6 Editor
The editor uses `@uiw/react-codemirror` configured with `@codemirror/lang-markdown` for inline markdown formatting and styling.
This provides syntax highlighting that is tightly coupled with the application's global theme context (Light/Dark mode via `useAppStore`).

## Wikilinks Parsing
Student OS supports a basic `[[wikilink]]` syntax for connecting ideas and documents.

**Parsing implementation (`src/pages/Journal.tsx`)**:
1. Uses regex pattern matching (`\[\[(.*?)\]\]`) over the current active file's string content.
2. Identifies matching blocks and builds outbound links dynamically.
3. Clicking an identified link attempts to load `vault_path\link_name.md`.
4. If a file exists, it opens in the editor. Otherwise, an alert notifies the user that the file does not exist.