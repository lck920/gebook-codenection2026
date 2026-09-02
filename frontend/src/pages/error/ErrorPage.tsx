import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { useRouter } from "@/app/router";
import { useDocumentTitle } from "@/shared/lib";
import {
  errorVariants,
  pickErrorPhoto,
  type ErrorAction,
  type ErrorVariant,
} from "./model/variants";
import { ErrorArt } from "./ui/ErrorArt";

export interface ErrorPageProps {
  variant: ErrorVariant;
  /** Overrides the `retry` action so an error boundary can reset its own state
   *  instead of doing a full page reload. */
  onRetry?: () => void;
}

/** Shared surface for every error state (404, 500, 403, 503, offline). Copy
 *  and imagery come from the variant config; layout, motion and actions are
 *  identical so the whole family feels like one product. */
export function ErrorPage({ variant, onRetry }: ErrorPageProps) {
  const { t } = useTranslation("error");
  const { navigate } = useRouter();
  const config = errorVariants[variant];

  // Freeze the random photo for the surface's lifetime so it never reshuffles
  // on re-render.
  const [photo] = useState(() => pickErrorPhoto(config.photos));

  useDocumentTitle(
    `${t(`variants.${variant}.eyebrow`)} · ${t("appName", { ns: "common" })}`,
  );

  const runAction = (action: ErrorAction) => {
    switch (action) {
      case "retry":
        if (onRetry) return onRetry();
        return window.location.reload();
      case "signIn":
        return navigate("/signin");
      case "home":
      default:
        return navigate("/");
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-16">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="wf-enter-stagger flex flex-col items-start">
          <h1 className="wf-enter text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
            {t(`variants.${variant}.title`)}
          </h1>

          <p className="wf-enter mt-4 max-w-md text-pretty text-muted-foreground">
            {t(`variants.${variant}.body`)}
          </p>

          <div className="wf-enter mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => runAction(config.primaryAction)}>
              {t(`actions.${config.primaryAction}`)}
            </Button>
            {config.secondaryAction && (
              <Button
                size="lg"
                variant="ghost"
                onClick={() => runAction(config.secondaryAction!)}
              >
                {t(`actions.${config.secondaryAction}`)}
              </Button>
            )}
          </div>
        </div>

        <div className="wf-enter order-first lg:order-none">
          <ErrorArt photo={photo} />
        </div>
      </div>
    </main>
  );
}
