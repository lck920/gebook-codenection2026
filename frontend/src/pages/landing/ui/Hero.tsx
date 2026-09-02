import { useTranslation } from "react-i18next";
import { BrowserFrame } from "./DeviceFrames";
import heroShot from "../assets/pc-map.jpg";

export function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation("landing");

  return (
    <section className="relative overflow-hidden">
      {/* Soft gradient aura */}
      <div className="absolute top-0 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-sky/20 via-brand-ice/30 to-transparent blur-3xl dark:from-brand-midnight/60 dark:via-card/40" />

      <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24">
        <div className="wf-enter-stagger mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="wf-enter font-heading text-4xl font-extrabold tracking-[-0.03em] text-foreground text-balance sm:text-6xl sm:leading-[1.1]">
            {t("hero.title")}
          </h1>

          <p className="wf-enter mt-4 font-heading text-xl font-bold text-brand sm:text-2xl">
            Let Gebook guide you.
          </p>

          <p className="wf-enter mt-4 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>

          {/* Duolingo-inspired Tactile Buttons & Auth Action Row */}
          <div className="wf-enter mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onGetStarted}
              className="wf-tactile-btn flex min-w-52 items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-3.5 font-heading text-base font-bold text-white shadow-lg transition-all hover:bg-brand/95"
            >
              <span>{t("hero.primary")}</span>
              <span>→</span>
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="wf-tactile-btn-white flex min-w-52 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-8 py-3.5 font-heading text-base font-bold text-foreground shadow-sm transition-all hover:bg-secondary"
            >
              <span>{t("hero.secondary")}</span>
            </button>
          </div>
        </div>

        <div className="wf-enter mx-auto mt-14 max-w-5xl">
          <BrowserFrame src={heroShot} alt={t("hero.imageAlt")} priority />
        </div>
      </div>
    </section>
  );
}
