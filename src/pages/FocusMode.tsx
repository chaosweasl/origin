import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../lib/store";
import { createFocusSession, finishFocusSession } from "../lib/db";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function FocusMode() {
  const store = useAppStore();
  const navigate = useNavigate();

  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(store.pomodoroWorkDuration * 60);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [originalWallpaper, setOriginalWallpaper] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    store.setTheme("focus");
    return () => {
      store.setTheme("normal");
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (!isBreak) {
        alert("Work session finished! Starting break.");
        setIsBreak(true);
        setTimeLeft(store.pomodoroBreakDuration * 60);
      } else {
        alert("Break finished! Back to work.");
        setIsBreak(false);
        setTimeLeft(store.pomodoroWorkDuration * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, store.pomodoroWorkDuration, store.pomodoroBreakDuration]);

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

        await invoke("set_dnd", { enabled: true });

        for (const app of store.focusAppsToBlock) {
          if (app.trim()) {
            await invoke("suspend_app", { name: app.trim() });
          }
        }
      } catch (e) {
        console.error("OS hook failed", e);
      }

      if (store.focusAudioPath) {
        if (!audioRef.current) {
          audioRef.current = new Audio(`asset://localhost/${encodeURIComponent(store.focusAudioPath)}`);
          audioRef.current.loop = true;
        }
        audioRef.current.play().catch(e => console.error("Audio play failed (might need absolute file path handling or asset protocol config)", e));
      }
    } else {
      setIsActive(true);
    }
  };

  const handlePause = () => {
    setIsActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleStop = async () => {
    setIsActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      if (originalWallpaper) {
        await invoke("set_wallpaper", { path: originalWallpaper });
        setOriginalWallpaper(null);
      }
      await invoke("set_dnd", { enabled: false });

      for (const app of store.focusAppsToBlock) {
        if (app.trim()) {
          await invoke("resume_app", { name: app.trim() });
        }
      }
    } catch (e) {
      console.error("OS hook revert failed", e);
    }

    if (sessionId) {
      await finishFocusSession(sessionId, store.pomodoroWorkDuration);
      setSessionId(null);
    }

    setTimeLeft(store.pomodoroWorkDuration * 60);
    setIsBreak(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{ backgroundColor: '#09090b', color: '#ffffff', zIndex: 9999 }}
      className="flex flex-col items-center justify-center fixed inset-0 overflow-hidden"
    >
      <button
        className="absolute top-8 left-8 px-4 py-2 border border-zinc-800 bg-zinc-900 rounded hover:bg-zinc-800 transition-colors"
        style={{ color: '#d4d4d8' }}
        onClick={() => {
          handleStop();
          navigate("/");
        }}
      >
        Exit Focus Mode
      </button>

      <div className="text-center z-10 p-12 bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-zinc-800 shadow-2xl" style={{ backgroundColor: 'rgba(24, 24, 27, 0.8)' }}>
        <h2 className="text-2xl font-medium tracking-widest uppercase mb-2" style={{ color: '#a1a1aa' }}>
          {isBreak ? "Break" : "Focus"}
        </h2>
        <div className="text-[8rem] font-bold tracking-tighter tabular-nums leading-none mb-8" style={{ color: '#ffffff' }}>
          {formatTime(timeLeft)}
        </div>

        <div className="flex justify-center gap-4">
          {!isActive ? (
            <button
              className="w-32 py-3 rounded-full font-medium text-lg transition-transform hover:scale-105"
              style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
              onClick={handleStart}
            >
              Start
            </button>
          ) : (
            <button
              className="w-32 py-3 rounded-full font-medium text-lg transition-transform hover:scale-105"
              style={{ backgroundColor: '#27272a', color: '#e4e4e7', border: '1px solid #3f3f46' }}
              onClick={handlePause}
            >
              Pause
            </button>
          )}

          <button
            className="w-32 py-3 rounded-full font-medium text-lg transition-transform hover:scale-105"
            style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
            onClick={handleStop}
            disabled={!sessionId}
          >
            Stop
          </button>
        </div>
      </div>
    </motion.div>
  );
}