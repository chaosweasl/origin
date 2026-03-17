# Student OS

Student OS is a Windows-only desktop productivity app built with Tauri 2 (Rust backend) and React + TypeScript (frontend).
It aims to help students stay focused and manage their productivity directly from their desktop.

## Features

- **Do Not Disturb Mode**: Automatically toggle Windows Focus Assist to silence notifications while you're studying.
- **App Suspend/Resume**: Temporarily suspend distracting applications so they cannot use system resources or interrupt your workflow, and resume them when you're done studying.
- **Wallpaper Control**: Change your desktop wallpaper dynamically based on your study session state.

*Note: As this application hooks deeply into Windows functionality (like suspending processes via `CreateToolhelp32Snapshot`), it is exclusively built for Windows platforms.*

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/)
- Visual Studio C++ Build Tools (required for building native Windows Rust dependencies like `sysinfo` and the `windows` crate).

### Setup & Installation

1. Clone the repository and navigate into the project directory.
2. Install the frontend dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm run tauri dev
   ```

### Building for Production

To create a production build of the application:
```bash
pnpm run tauri build
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
