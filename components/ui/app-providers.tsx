"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { OneSignalProvider } from "@/components/notifications/onesignal-provider";
import { StoreProvider } from "@/lib/store/app-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StoreProvider>{children}</StoreProvider>
      <OneSignalProvider />
    </AuthProvider>
  );
}