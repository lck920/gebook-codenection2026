import { useTranslation } from "react-i18next";
import logo from "../assets/logo.png";

export function LandingFooter() {
  const { t } = useTranslation("landing");
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-10 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Gebook logo"
              className="size-7 rounded-lg object-contain shadow-xs ring-1 ring-border/40"
            />
            <span className="font-heading text-base font-bold text-foreground">
              {t("appName", { ns: "common" })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t("footer.tagline")}</p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <p className="text-xs text-muted-foreground">{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
