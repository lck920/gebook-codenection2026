import { useTranslation } from "react-i18next";
import { useResolvedTheme } from "@/shared/lib/theme";
import { ContainerScroll } from "@/shared/ui/container-scroll";
import { GradientWave } from "@/shared/ui/gradient-wave";
import { BrowserFrame } from "./DeviceFrames";
import heroShot from "../assets/pc-map.jpg";
import heroIcon from "../assets/hero-icon.jpg";

/* Mesh-gradient palettes, module-scoped so the array reference stays stable
 * across renders and `GradientWave` doesn't re-initialise WebGL on every pass.
 *
 * Each palette is picked to sit clearly *away* from its own background token
 * while still clearing contrast against the headline colour:
 *  - light (`--background` #ffffff, text #020d33): tinted sky/cyan, never white,
 *    so the wave reads against the page.
 *  - dark (`--background` #020d33, text #edf7fd): mid-to-deep royal blues,
 *    bright enough to be obvious on near-black, dark enough that the near-white
 *    headline still clears 4.5:1 over every layer. */
const HERO_GRADIENT_LIGHT = ["#eaf6ff", "#b8e8ff", "#d6f2fd", "#8fdcfa", "#e3f4ff", "#c2ecff"];
const HERO_GRADIENT_DARK = ["#04184f", "#0d3f9e", "#082a6b", "#1257cc", "#06215c", "#0a3a8f"];

export function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation("landing");
  const theme = useResolvedTheme();

  return (
    <section className="relative isolate overflow-hidden">
      {/* Animated mesh-gradient backdrop. `isolate` on the section keeps this
          `-z-10` layer above the page's own `bg-background` instead of being
          painted behind it; the scrim only fades the bottom so the product shot
          below still sits on a clean background. */}
      <div className="absolute inset-0 -z-10">
        <GradientWave
          colors={theme === "dark" ? HERO_GRADIENT_DARK : HERO_GRADIENT_LIGHT}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/5 to-background" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24">
        <div className="wf-enter-stagger mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* `outline-none!` is load-bearing: global.css puts a 1px outline on
              every `img`, and that rule is unlayered, so it outranks Tailwind's
              layered utilities unless this one is marked important. */}
          <img
            src={heroIcon}
            alt={t("hero.iconAlt")}
            width={320}
            height={320}
            loading="eager"
            decoding="async"
            className="wf-enter mb-6 size-24 rounded-2xl object-cover outline-none! sm:size-32"
          />

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

        <ContainerScroll className="wf-enter mx-auto mt-14 max-w-5xl">
          <BrowserFrame src={heroShot} alt={t("hero.imageAlt")} priority />
        </ContainerScroll>
      </div>
    </section>
  );
}
