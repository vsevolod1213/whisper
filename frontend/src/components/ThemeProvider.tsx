import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: Exclude<ThemeMode, "system">;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "filety-theme";

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // persist explicit changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // resolve and apply actual theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (theme: "light" | "dark") => {
      setResolved(theme);
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    };

    const pick = () => (mediaQuery.matches ? "dark" : "light");
    const current = mode === "system" ? pick() : mode;
    apply(current);

    const handleChange = () => {
      if (mode === "system") {
        apply(pick());
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  // sync favicon + theme-color meta
  useEffect(() => {
    if (typeof document === "undefined") return;
    const favicon = document.getElementById("site-favicon") as HTMLLinkElement | null;
    const themeMeta = document.getElementById("theme-color") as HTMLMetaElement | null;
    const isDark = resolved === "dark";

    if (favicon) {
      favicon.href = isDark ? "/icon0.svg" : "/icon1.png";
      favicon.type = isDark ? "image/svg+xml" : "image/png";
    }

    if (themeMeta) {
      themeMeta.content = isDark ? "#0f172a" : "#f8fafc";
    }
  }, [resolved]);

  const value = useMemo(
    () => ({
      mode,
      resolved,
      setMode,
    }),
    [mode, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
