import React, { createContext, useContext, useState, useEffect } from "react";

interface AIStudioThemeContextType {
  theme: "light" | "dark";
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

const AIStudioThemeContext = createContext<AIStudioThemeContextType>({
  theme: "dark",
  isLight: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const AIStudioThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("ai_studio_theme") || localStorage.getItem("dashboard_theme") || localStorage.getItem("studio_theme");
    return saved === "light" ? "light" : "dark";
  });

  const isLight = theme === "light";

  const setTheme = (next: "light" | "dark") => {
    setThemeState(next);
    localStorage.setItem("ai_studio_theme", next);
    localStorage.setItem("dashboard_theme", next);
    if (next === "light") {
      document.documentElement.classList.add("admin-light-mode");
    } else {
      document.documentElement.classList.remove("admin-light-mode");
    }
    window.dispatchEvent(new Event("dashboard-theme-change"));
  };

  const toggleTheme = () => {
    setTheme(isLight ? "dark" : "light");
  };

  useEffect(() => {
    // Sync class on documentElement
    if (isLight) {
      document.documentElement.classList.add("admin-light-mode");
    } else {
      document.documentElement.classList.remove("admin-light-mode");
    }

    const handleSync = () => {
      const current = localStorage.getItem("dashboard_theme") || localStorage.getItem("ai_studio_theme");
      if (current === "light" || current === "dark") {
        setThemeState(current);
      }
    };

    window.addEventListener("dashboard-theme-change", handleSync);
    return () => {
      window.removeEventListener("dashboard-theme-change", handleSync);
    };
  }, [isLight]);

  return (
    <AIStudioThemeContext.Provider value={{ theme, isLight, toggleTheme, setTheme }}>
      {children}
    </AIStudioThemeContext.Provider>
  );
};

export const useAIStudioTheme = () => useContext(AIStudioThemeContext);
