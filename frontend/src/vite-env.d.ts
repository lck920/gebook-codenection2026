/// <reference types="vite/client" />

declare const __WETRAVEL_BASE_URL__: string;
declare const __WETRAVEL_VERSION__: string;

declare module "virtual:pwa-register" {
    export interface RegisterSWOptions {
        immediate?: boolean;
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
        onRegisteredSW?: (
            swScriptUrl: string,
            registration: ServiceWorkerRegistration | undefined,
        ) => void;
        onRegisterError?: (error: unknown) => void;
    }

    export function registerSW(
        options?: RegisterSWOptions,
    ): (reloadPage?: boolean) => Promise<void>;
}
