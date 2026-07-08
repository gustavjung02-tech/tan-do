"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useAuth } from "@/components/auth/auth-provider";

type OneSignalSdk = {
  init: (options: { appId: string }) => Promise<void>;
  login?: (externalId: string) => Promise<void>;
  logout?: () => Promise<void>;
  Notifications?: {
    permission?: boolean | string;
    requestPermission?: () => Promise<boolean>;
  };
  User?: {
    onesignalId?: string;
    PushSubscription?: {
      id?: string;
      optedIn?: boolean;
      optIn?: () => Promise<void>;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalSdk) => Promise<void> | void>;
  }
}

async function registerDevice(accessToken: string, OneSignal: OneSignalSdk) {
  const subscription = OneSignal.User?.PushSubscription;
  const subscriptionId = subscription?.id;

  if (!subscriptionId) return;

  await fetch("/api/notifications/register-device", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      onesignalId: OneSignal.User?.onesignalId ?? null,
      subscriptionId,
      permission: String(OneSignal.Notifications?.permission ?? "unknown"),
      optedIn: subscription?.optedIn ?? true,
    }),
  });
}

export function OneSignalProvider() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const { session, profile } = useAuth();
  const initializedRef = useRef(false);
  const registeredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!appId || !session || !profile) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (!initializedRef.current) {
          await OneSignal.init({ appId });
          initializedRef.current = true;
        }

        await OneSignal.login?.(profile.id);

        const permission = OneSignal.Notifications?.permission;
        if (permission !== true) {
          await OneSignal.Notifications?.requestPermission?.();
        }

        await OneSignal.User?.PushSubscription?.optIn?.();
        await registerDevice(session.access_token, OneSignal);
        registeredKeyRef.current = `${profile.id}:${OneSignal.User?.PushSubscription?.id ?? ""}`;
      } catch (error) {
        console.error("OneSignal registration failed", error);
      }
    });
  }, [appId, session, profile]);

  useEffect(() => {
    if (session || !initializedRef.current) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.logout?.();
        registeredKeyRef.current = null;
      } catch (error) {
        console.error("OneSignal logout failed", error);
      }
    });
  }, [session]);

  if (!appId) return null;

  return <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />;
}
