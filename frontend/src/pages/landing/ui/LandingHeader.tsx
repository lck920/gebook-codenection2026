import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/features/toggle-theme";
import { cn } from "@/shared/lib";
import logo from "../assets/logo.png";

/** Tracks whether the page has scrolled past the hero fold, so the header can
 * fade in a backdrop only when content sits behind it. */
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

export function LandingHeader({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation("landing");
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-border bg-background/80 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
      style={{ top: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="/" className="flex items-center gap-2.5" aria-label={t("appName", { ns: "common" })}>
          <img
            src={logo}
            alt="Gebook logo"
            className="size-9 rounded-xl object-contain shadow-xs ring-1 ring-border/50"
          />
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            {t("appName", { ns: "common" })}
          </span>
        </a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={onSignIn}
            className="wf-tactile-btn rounded-2xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand/90"
          >
            {t("nav.signIn")}
          </button>
        </div>
      </div>
    </header>
  );
}
