use tauri::command;
#[cfg(target_os = "windows")]
use sysinfo::System;
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::CloseHandle;
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{OpenThread, SuspendThread, ResumeThread, THREAD_SUSPEND_RESUME};
#[cfg(target_os = "windows")]
use windows::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Thread32First, Thread32Next, TH32CS_SNAPTHREAD, THREADENTRY32};

#[command]
pub fn set_wallpaper(path: String) -> Result<(), String> {
    wallpaper::set_from_path(&path).map_err(|e| e.to_string())
}

#[command]
pub fn get_current_wallpaper() -> Result<String, String> {
    wallpaper::get().map_err(|e| e.to_string())
}

#[command]
pub fn set_dnd(enabled: bool) -> Result<(), String> {
    // Focus Assist (Do Not Disturb) for Windows
    // OOBE (0) = Off, PriorityOnly (1) = Priority only, AlarmsOnly (2) = Alarms only
    let value = if enabled { 2 } else { 0 };

    let powershell_cmd = format!(
        "$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\UserProfileEngagement'; \
        if (-not (Test-Path $path)) {{ New-Item -Path $path -Force | Out-Null }}; \
        Set-ItemProperty -Path $path -Name 'ScoobeSystemSettingEnabled' -Value 0; \
        $wcosPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\WINEVT\\Channels\\Microsoft-Windows-FocusAssist/Operational'; \
        Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value {};",
        if enabled { 0 } else { 1 }
    );

    // Simplest way to toggle via powershell
    let script = format!(
        "{} \
        Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value {};",
        powershell_cmd, value
    );

    std::process::Command::new("powershell")
        .args(&["-Command", &script])
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[allow(unused_variables)]
fn control_process(app_name: &str, suspend: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut sys = System::new_all();
        sys.refresh_all();

        for (pid, process) in sys.processes() {
            if process.name().to_string_lossy().to_lowercase().contains(&app_name.to_lowercase()) {
                unsafe {
                    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0).map_err(|e| e.to_string())?;
                    let mut te32 = THREADENTRY32 {
                        dwSize: std::mem::size_of::<THREADENTRY32>() as u32,
                        ..Default::default()
                    };

                    if Thread32First(snapshot, &mut te32).is_ok() {
                        loop {
                            if te32.th32OwnerProcessID == pid.as_u32() {
                                if let Ok(thread_handle) = OpenThread(THREAD_SUSPEND_RESUME, false, te32.th32ThreadID) {
                                    if suspend {
                                        SuspendThread(thread_handle);
                                    } else {
                                        ResumeThread(thread_handle);
                                    }
                                    let _ = CloseHandle(thread_handle);
                                }
                            }
                            if Thread32Next(snapshot, &mut te32).is_err() {
                                break;
                            }
                        }
                    }
                    let _ = CloseHandle(snapshot);
                }
            }
        }
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
    }
}


#[command]
pub fn suspend_app(name: String) -> Result<(), String> {
    control_process(&name, true)
}

#[command]
pub fn resume_app(name: String) -> Result<(), String> {
    control_process(&name, false)
}