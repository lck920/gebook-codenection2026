import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
  type ThemeMode,
} from "@/shared/lib/theme";
import { THEME_CHANGE_EVENT } from "@/shared/config/theme";
import { applyTheme } from "../lib/apply-theme";
import { interactive } from "@/shared/lib";

export function ThemeToggle({ className }: { className?: string }) {
  const [resolvedDark, setResolvedDark] = useState<boolean>(() => {
    return resolveTheme(getStoredTheme()) === "dark";
  });

  useEffect(() => {
    const onThemeChange = () => {
      setResolvedDark(resolveTheme(getStoredTheme()) === "dark");
    };
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  const toggle = () => {
    const next: ThemeMode = resolvedDark ? "light" : "dark";
    setStoredTheme(next);
    applyTheme();
    setResolvedDark(next === "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={resolvedDark ? "Switch to Light theme" : "Switch to Dark theme"}
      aria-label={resolvedDark ? "Switch to Light theme" : "Switch to Dark theme"}
      className={`flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-all hover:bg-secondary ${interactive} ${className ?? ""}`}
    >
      {resolvedDark ? (
        <Sun className="size-4 text-brand-sky" />
      ) : (
        <Moon className="size-4 text-brand" />
      )}
    </button>
  );
}
