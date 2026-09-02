import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enTrips from "./locales/en/trips.json";
import enPlanner from "./locales/en/planner.json";
import enAuth from "./locales/en/auth.json";
import enInvite from "./locales/en/invite.json";
import enAgent from "./locales/en/agent.json";
import enLanding from "./locales/en/landing.json";
import enError from "./locales/en/error.json";

export const resources = {
  en: {
    common: enCommon,
    trips: enTrips,
    planner: enPlanner,
    auth: enAuth,
    invite: enInvite,
    agent: enAgent,
    landing: enLanding,
    error: enError,
  },
} as const;

export const supportedLanguages = ["en"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const defaultNS = "common";

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    defaultNS,
    ns: ["common", "trips", "planner", "auth", "invite", "agent", "landing", "error"],
    interpolation: { escapeValue: false },
  });

export default i18n;
