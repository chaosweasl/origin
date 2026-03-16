# Setup

This repository contains a Tauri 2 application with a Rust backend and a React (TypeScript, Vite) frontend.

## Prerequisites
- **Node.js**: v18 or later
- **pnpm**: v8 or later
- **Rust**: 1.70 or later
- **Windows Build Tools**: Visual Studio C++ Build Tools (Required to compile native Windows dependencies like `sysinfo` and `windows`).

## Running in Development

1. Install Node dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server (starts Vite and Tauri concurrently):
   ```bash
   pnpm run tauri dev
   ```

## Building for Production

To create a standalone `.msi` and `.exe` installer for Windows:

```bash
pnpm run tauri build
```

This command will output the compiled binaries in `src-tauri/target/release/bundle/`.

### Windows-Only Notes
- **Focus Mode**: Focus mode uses `sysinfo`, the `windows` crate, and PowerShell commands to interact with Windows Focus Assist and Process Threads. This code will fail to compile on macOS or Linux unless properly cross-compiled or placed behind `#[cfg(target_os = "windows")]` attributes. The app is intentionally designed exclusively for Windows.