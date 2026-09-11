import { useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import {
  emailOTPClient,
  inferAdditionalFields,
  twoFactorClient,
} from "better-auth/client/plugins";
import { config } from "@/shared/config";
import i18n from "@/shared/i18n";
import {
  getLocalTestSession,
  setLocalTestSession,
  clearLocalTestSession,
  LOCAL_AUTH_EVENT,
  type LocalSessionData,
} from "@/shared/lib/local-test-mode";

/** Set by AuthForm so twoFactorClient can switch the UI without a full reload. */
let onTwoFactorRequired: (() => void) | null = null;

export function setTwoFactorRequiredHandler(handler: (() => void) | null): void {
  onTwoFactorRequired = handler;
}

export const authClient = createAuthClient({
  baseURL: config.baseUrl,
  basePath: "/api/auth",
  fetchOptions: {
    onRequest(context) {
      const headers = new Headers(context.headers);
      headers.set(
        "x-gebook-lang",
        i18n.resolvedLanguage?.split("-")[0] ?? i18n.language?.split("-")[0] ?? "en",
      );
      return { ...context, headers };
    },
  },
  plugins: [
    emailOTPClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        onTwoFactorRequired?.();
      },
    }),
    inferAdditionalFields({
      user: {
        defaultCurrency: {
          type: "string",
          required: false,
          input: true,
        },
        twoFactorEnabled: {
          type: "boolean",
          required: false,
          input: false,
        },
      },
    }),
  ],
});

export const { signIn, signUp } = authClient;

export function useSession() {
  const betterAuthSession = authClient.useSession();
  const [localSession, setLocalSession] = useState<LocalSessionData | null>(() => getLocalTestSession());

  useEffect(() => {
    const onAuthChange = () => {
      setLocalSession(getLocalTestSession());
    };
    window.addEventListener(LOCAL_AUTH_EVENT, onAuthChange);
    return () => window.removeEventListener(LOCAL_AUTH_EVENT, onAuthChange);
  }, []);

  if (localSession) {
    return {
      data: localSession as unknown as typeof betterAuthSession.data,
      isPending: false,
      isRefetching: false,
      error: null,
      refetch: () => Promise.resolve(),
    };
  }

  return betterAuthSession;
}

export async function signOut(options?: Parameters<typeof authClient.signOut>[0]) {
  clearLocalTestSession();
  try {
    return await authClient.signOut(options);
  } catch {
    return { data: { success: true }, error: null };
  }
}

export { setLocalTestSession, clearLocalTestSession };
