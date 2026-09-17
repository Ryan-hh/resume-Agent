import * as React from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = React.createContext<{
  theme: Theme;
  systemTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}>({ theme: "system", systemTheme: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    try {
      return (localStorage.getItem("resume-theme") as Theme) || "system";
    } catch {
      return "system";
    }
  });
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = () => setSystemTheme(media.matches ? "dark" : "light");
    updateSystem();
    media.addEventListener("change", updateSystem);
    return () => media.removeEventListener("change", updateSystem);
  }, []);

  React.useEffect(() => {
    const resolved = theme === "system" ? systemTheme : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    try {
      localStorage.setItem("resume-theme", theme);
    } catch {
      // ignore
    }
  }, [theme, systemTheme]);

  const setTheme = React.useCallback((t: Theme) => setThemeState(t), []);

  return (
    <ThemeContext.Provider value={{ theme, systemTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => React.useContext(ThemeContext);
