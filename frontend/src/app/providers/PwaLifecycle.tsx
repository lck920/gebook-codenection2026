import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { registerSW } from "virtual:pwa-register";
import { toastManager } from "@/shared/ui/toast";

export function PwaLifecycle() {
    const { t } = useTranslation("common");

    useEffect(() => {
        const updateServiceWorker = registerSW({
            immediate: true,
            onOfflineReady() {
                toastManager.add({
                    title: t("pwa.offlineReady"),
                    type: "success",
                    timeout: 4_000,
                });
            },
            onNeedRefresh() {
                toastManager.add({
                    title: t("pwa.updateReady"),
                    description: t("pwa.updateDescription"),
                    type: "info",
                    timeout: 0,
                    actionProps: {
                        children: t("pwa.updateAction"),
                        onClick: () => void updateServiceWorker(true),
                    },
                });
            },
        });
    }, [t]);

    return null;
}
