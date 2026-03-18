import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "./lib/store";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Home,
  Layers,
  CheckSquare,
  BookOpen,
  FileText,
  Target,
  Settings,
  Sun,
  Moon,
  Flame
} from "lucide-react";
import ToastContainer from "./components/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const { loadStore } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  };

  useEffect(() => {
    // Default to dark mode
    if (!document.documentElement.classList.contains("light") && !document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const navLinks = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Flashcards", path: "/flashcards", icon: Layers },
    { name: "Quiz", path: "/quiz", icon: CheckSquare },
    { name: "Journal", path: "/journal", icon: BookOpen },
    { name: "Cheatsheets", path: "/cheatsheets", icon: FileText },
    { name: "Focus Mode", path: "/focus", icon: Target },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Sidebar / Left Rail */}
      <aside className="group w-16 hover:w-56 transition-all duration-300 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col z-20 overflow-hidden shrink-0">
        <div className="p-4 flex items-center min-w-max h-16">
          <Flame className="text-[var(--accent-gold)] shrink-0" size={24} />
          <h1 className="text-xl font-serif font-semibold tracking-wide ml-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Student OS
          </h1>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-x-hidden">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;

            return (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "flex items-center min-w-max px-4 py-3 transition-colors relative",
                  isActive
                    ? "text-[var(--accent-gold)] bg-[var(--bg-hover)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                )}
                title={link.name}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent-gold)]" />
                )}
                <Icon size={20} className="shrink-0" strokeWidth={1.5} />
                <span className="ml-4 text-sm font-mono tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-[var(--border-subtle)] flex flex-col space-y-1 pb-4">
          <button
            onClick={toggleTheme}
            className="flex items-center min-w-max px-2 py-3 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors rounded"
            title="Toggle Theme"
          >
            <div className="w-8 flex justify-center shrink-0">
              <Sun size={20} className="hidden dark:block shrink-0" strokeWidth={1.5} />
              <Moon size={20} className="block dark:hidden shrink-0" strokeWidth={1.5} />
            </div>
            <span className="ml-2 text-sm font-mono tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Toggle Theme
            </span>
          </button>

          <Link
            to="/settings"
            className={cn(
              "flex items-center min-w-max px-2 py-3 transition-colors rounded relative",
              location.pathname === "/settings"
                ? "text-[var(--accent-gold)] bg-[var(--bg-hover)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}
            title="Settings"
          >
             {location.pathname === "/settings" && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent-gold)]" />
              )}
            <div className="w-8 flex justify-center shrink-0">
              <Settings size={20} className="shrink-0" strokeWidth={1.5} />
            </div>
            <span className="ml-2 text-sm font-mono tracking-wide opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Settings
            </span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-[var(--bg-base)] relative">
        {/* Paper Grain Noise Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        <div className="relative z-10 h-full">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;
