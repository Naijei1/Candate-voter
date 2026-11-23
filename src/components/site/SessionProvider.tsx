"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { withBasePath } from "@/lib/base-path";

export type ClientSession = {
  signedIn: boolean;
  email: string | null;
  admin: boolean;
};

type SessionValue = ClientSession & { clearSession: () => void };

const EMPTY: ClientSession = { signedIn: false, email: null, admin: false };
const SessionContext = createContext<SessionValue>({ ...EMPTY, clearSession: () => {} });

/** First paint is signed out. The session route is private and does not mark public HTML as uncacheable. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession>(EMPTY);
  const generation = useRef(0);
  const clearSession = useCallback(() => {
    generation.current += 1;
    setSession(EMPTY);
  }, []);
  useEffect(() => {
    const mine = ++generation.current;
    let active = true;
    fetch(withBasePath("/api/auth/session"), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() as Promise<ClientSession> : null))
      .then((body) => {
        if (active && mine === generation.current && body?.signedIn) setSession(body);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return <SessionContext.Provider value={{ ...session, clearSession }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
