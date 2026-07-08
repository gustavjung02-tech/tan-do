"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

type AppRole = "customer" | "sales" | "admin";

type AuthProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  profile: AuthProfile | null;
  isStaff: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(session: Session | null) {
  if (!session) return null;

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) return null;
  const payload = await response.json() as { profile: AuthProfile | null };
  return payload.profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  async function refreshProfile() {
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser.auth.getSession();
    setSession(data.session);
    setProfile(await loadProfile(data.session));
  }

  async function signOut() {
    if (!supabaseBrowser) return;
    await supabaseBrowser.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!supabaseBrowser) {
        setLoading(false);
        return;
      }

      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setProfile(await loadProfile(data.session));
      setLoading(false);
    }

    void boot();

    const { data: listener } = supabaseBrowser?.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setProfile(await loadProfile(nextSession));
      setLoading(false);
    }) ?? { data: { subscription: null } };

    return () => {
      mounted = false;
      listener.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const isStaff = profile?.role === "sales" || profile?.role === "admin";
    return { loading, session, profile, isStaff, refreshProfile, signOut };
  }, [loading, session, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}