import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Journal from "./pages/Journal";
import Cheatsheets from "./pages/Cheatsheets";
import FocusMode from "./pages/FocusMode";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="journal" element={<Journal />} />
          <Route path="cheatsheets" element={<Cheatsheets />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/focus" element={<FocusMode />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);