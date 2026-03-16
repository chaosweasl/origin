import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "./lib/store";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const { loadStore } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    loadStore();
  }, []);

  const navLinks = [
    { name: "Dashboard", path: "/" },
    { name: "Flashcards", path: "/flashcards" },
    { name: "Quiz", path: "/quiz" },
    { name: "Journal", path: "/journal" },
    { name: "Cheatsheets", path: "/cheatsheets" },
    { name: "Focus Mode", path: "/focus" },
    { name: "Settings", path: "/settings" },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">Student OS</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={cn(
                "block px-4 py-2 rounded-md transition-colors",
                location.pathname === link.path
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}

export default App;