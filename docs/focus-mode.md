# Focus Mode

Focus Mode is a central feature of Student OS designed to limit distractions during study sessions by taking over the Windows environment.

## Features

- **Custom Timer:** A Pomodoro-style configurable timer (work/break intervals).
- **Background Audio:** Local audio files (.mp3, .ogg) played via HTML5 `<audio>` tags in React.
- **Do Not Disturb (DND):** Toggles Windows "Focus Assist" to suppress notifications.
- **Wallpaper Override:** Temporarily changes the desktop wallpaper to a user-defined focus background and restores the original wallpaper after the session.
- **App Blocking:** Temporarily suspends specific processes running on the machine to prevent context-switching.

## Implementation Details

The underlying OS interactions are implemented purely in Rust (`src-tauri/src/commands/focus.rs`) and exposed to the React frontend.

- **Wallpaper (`set_wallpaper`, `get_current_wallpaper`):** Uses the `wallpaper` crate to read the current registry key/system parameters and write new paths for the background image.
- **Do Not Disturb (`set_dnd`):** Executes PowerShell scripts to toggle the `NOC_GLOBAL_SETTING_TOASTS_ENABLED` registry key under `HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings`.
- **Process Suspension (`suspend_app`, `resume_app`):**
  - Retrieves process PID using `sysinfo`.
  - Uses `windows` crate API: `CreateToolhelp32Snapshot`, `OpenThread`, `SuspendThread`, and `ResumeThread` to freeze specific running processes.