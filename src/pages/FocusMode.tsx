import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../lib/store";
import { createFocusSession, finishFocusSession } from "../lib/db";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react";
import { toast } from "../lib/toastStore";
import ToastContainer from "../components/ToastContainer";
import Modal from "../components/Modal";

export default function FocusMode() {
  const store = useAppStore();
  const navigate = useNavigate();

  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(store.pomodoroWorkDuration * 60);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [isMuted, setIsMuted] = useState(false);

  const [originalWallpaper, setOriginalWallpaper] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    store.setTheme("focus");
    return () => {
      store.setTheme("normal");
    };
  }, [store]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (!isBreak) {
        toast("Work session finished! Starting break.", "success");
        setIsBreak(true);
        setTimeLeft(store.pomodoroBreakDuration * 60);
      } else {
        toast("Break finished! Back to work.", "info");
        setIsBreak(false);
        setTimeLeft(store.pomodoroWorkDuration * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, store.pomodoroWorkDuration, store.pomodoroBreakDuration]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleStart = async () => {
    if (!isActive && !sessionId) {
      const id = await createFocusSession();
      setSessionId(id);
      setIsActive(true);

      try {
        if (store.focusWallpaperPath) {
          const current = await invoke<string>("get_current_wallpaper");
          setOriginalWallpaper(current);
          await invoke("set_wallpaper", { path: store.focusWallpaperPath });
        }

        try {
          await invoke("set_dnd", { enabled: true });
        } catch (e) {
          console.error("DND failed", e);
          toast("Could not enable Do Not Disturb — you may need to run Student OS as Administrator.", "warning");
        }

        for (const app of store.focusAppsToBlock) {
          if (app.trim()) {
            let baseName = app.trim();
            if (baseName.toLowerCase().endsWith('.exe')) {
              baseName = baseName.slice(0, -4);
            }
            // Try both just in case
            await invoke("suspend_app", { name: baseName }).catch(console.error);
            await invoke("suspend_app", { name: `${baseName}.exe` }).catch(console.error);
          }
        }
      } catch (e) {
        console.error("OS hook failed", e);
      }

      if (store.focusAudioPath) {
        if (!audioRef.current) {
          // Tauri 2 v2 protocol uses https://tauri.localhost/asset/ instead of asset://
          // Note: you must configure "asset" protocol scope in tauri.conf.json for this to work natively
          audioRef.current = new Audio(`https://tauri.localhost/asset/${encodeURIComponent(store.focusAudioPath)}`);
          audioRef.current.loop = true;
          audioRef.current.muted = isMuted;
        }
        audioRef.current.play().catch(e => {
          console.error("Audio play failed", e);
          toast("Failed to play background audio. Check file path and tauri.conf.json asset scope.", "warning");
        });
      }
    } else {
      setIsActive(true);
      if (audioRef.current && !isMuted) {
         audioRef.current.play().catch(console.error);
      }
    }
  };

  const handlePause = () => {
    setIsActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleStop = async (navAway: boolean = false) => {
    if (sessionId && navAway && isActive) {
      setShowConfirmModal(true);
      return;
    }

    await executeStop(navAway);
  };

  const executeStop = async (navAway: boolean = false) => {
    setIsActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      if (originalWallpaper) {
        await invoke("set_wallpaper", { path: originalWallpaper }).catch(console.error);
        setOriginalWallpaper(null);
      }
      await invoke("set_dnd", { enabled: false }).catch(console.error);

      for (const app of store.focusAppsToBlock) {
        if (app.trim()) {
          let baseName = app.trim();
          if (baseName.toLowerCase().endsWith('.exe')) {
            baseName = baseName.slice(0, -4);
          }
          await invoke("resume_app", { name: baseName }).catch(console.error);
          await invoke("resume_app", { name: `${baseName}.exe` }).catch(console.error);
        }
      }
    } catch (e) {
      console.error("OS hook revert failed", e);
    }

    if (sessionId) {
      // Calculate how many minutes elapsed in total
      // Since it's a simple app, we just log the configured pomodoro work duration or a chunk of it
      // if it wasn't a break.
      const timeSpentSec = (store.pomodoroWorkDuration * 60) - timeLeft;
      const durationMins = Math.round(timeSpentSec / 60);
      await finishFocusSession(sessionId, durationMins > 0 ? durationMins : store.pomodoroWorkDuration);
      setSessionId(null);
    }

    setTimeLeft(store.pomodoroWorkDuration * 60);
    setIsBreak(false);

    if (navAway) {
      navigate("/");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate dash array for circle progress
  const totalSeconds = isBreak ? store.pomodoroBreakDuration * 60 : store.pomodoroWorkDuration * 60;
  const progress = timeLeft / totalSeconds;
  const circumference = 2 * Math.PI * 45; // r=45
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <>
      <ToastContainer />

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="End Focus Session?">
        <p className="text-sm font-mono mb-6">Are you sure you want to end your focus session early?</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            onClick={() => setShowConfirmModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-[var(--accent-ember)] text-white rounded-md font-mono text-sm font-medium hover:bg-red-600 transition-colors"
            onClick={() => {
              setShowConfirmModal(false);
              executeStop(true);
            }}
          >
            End Session
          </button>
        </div>
      </Modal>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="flex flex-col items-center justify-center fixed inset-0 overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 bg-[#0e0c0a]">
          <div
            className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen"
            style={{
              background: `radial-gradient(circle at 50% 50%, #1a150d 0%, #0e0c0a 100%)`,
              animation: 'pulseBg 8s infinite alternate'
            }}
          />
          <style>{`
            @keyframes pulseBg {
              0% { transform: scale(1); opacity: 0.5; }
              100% { transform: scale(1.1); opacity: 0.8; }
            }
          `}</style>

          {/* Subtle noise over bg */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }}
          />
        </div>

        {/* Top left exit */}
        <button
          className="absolute top-8 left-8 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-mono text-sm z-20 flex items-center gap-2"
          onClick={() => handleStop(true)}
        >
          &times; End Session
        </button>

        {/* Top right sound toggle */}
        {store.focusAudioPath && (
          <div className="absolute top-8 right-8 z-20 flex items-center gap-3">
            <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[150px]">
              {(store.focusAudioPath.split('\\').pop() || store.focusAudioPath.split('/').pop() || "").replace(".mp3", "")}
            </span>
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] backdrop-blur-sm transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        )}

        {/* Blocked Apps Panel */}
        {store.focusAppsToBlock.length > 0 && isActive && (
          <div className="absolute bottom-8 right-8 z-20 bg-[var(--bg-elevated)]/30 backdrop-blur-md border border-[var(--border-subtle)] p-4 rounded-xl shadow-2xl flex flex-col gap-2 pointer-events-none">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1">Suspended Apps</span>
            {store.focusAppsToBlock.map(app => (
              <div key={app} className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-ember)] animate-pulse" />
                {app}
              </div>
            ))}
          </div>
        )}

        {/* Main Timer Display */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-[var(--accent-gold)] font-mono text-[11px] uppercase tracking-[0.15em] mb-8">
            {isBreak ? "Break" : "Work Session"}
          </div>

          <div className="relative flex items-center justify-center w-[400px] h-[400px]">
            {/* SVG Progress Arc */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--accent-gold)"
                strokeWidth="1.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(201,168,76,0.3))"
                }}
              />
            </svg>

            {/* Time */}
            <div className="text-[120px] font-serif text-[var(--text-primary)] tabular-nums leading-none tracking-tight shadow-black drop-shadow-2xl">
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-6 mt-12">
            {!isActive ? (
              <button
                className="w-16 h-16 flex items-center justify-center rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-all hover:scale-105"
                onClick={handleStart}
              >
                <Play size={24} className="ml-1" fill="currentColor" />
              </button>
            ) : (
              <button
                className="w-16 h-16 flex items-center justify-center rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-all hover:scale-105"
                onClick={handlePause}
              >
                <Pause size={24} fill="currentColor" />
              </button>
            )}

            <button
              className={`w-16 h-16 flex items-center justify-center rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--border-default)] transition-all ${sessionId ? 'text-[var(--text-primary)] hover:border-[var(--accent-ember)] hover:text-[var(--accent-ember)] hover:scale-105' : 'text-[var(--text-muted)] opacity-50 cursor-not-allowed'}`}
              onClick={() => handleStop(false)}
              disabled={!sessionId}
            >
              <Square size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}