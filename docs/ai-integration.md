# AI Integration

Student OS leverages the Anthropic API (`claude-3-haiku-20240307`) to augment note-taking and studying.

## API Key Management
The user provides their own Anthropic API key in the `Settings` page. This is securely stored in Tauri's native `tauri-plugin-store` and managed globally via Zustand (`useAppStore()`). The key is never hardcoded.

## Features & Prompts

### 1. Flashcard Generation (`src/pages/Flashcards.tsx`)
Converts pasted notes or text blocks into structured flashcards for studying.

**Prompt Template:**
```text
Generate flashcards from the following text. Return ONLY a valid JSON array of objects, each with a "front" and "back" property, and no other text or markdown wrappers.

Text: {pasted_text}
```

The response is stripped of markdown wrappers (`\`\`\`json`) and parsed into an array of objects which are immediately created within the selected `deck` via `app.db`.

### 2. Cheatsheet Summarization (`src/pages/Cheatsheets.tsx`)
Summarizes lengthy texts into succinct two-column markdown tables (`Term | Definition`).

**Prompt Template:**
```text
Create a markdown cheatsheet summarizing the following text. The output MUST be a strict Markdown table with exactly two columns: Term | Definition. Do not include any other text before or after the table.

Text: {pasted_text}
```

The response is appended directly to the currently active markdown cheatsheet in the user's vault.