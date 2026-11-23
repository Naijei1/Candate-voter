"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { withBasePath } from "@/lib/base-path";

export type ClientSession = {
  signedIn: boolean;
  email: string | null;
  admin: boolean;
};

const EMPTY: ClientSession = { signedIn: false, email: null, admin: false };
const SessionContext = createContext<ClientSession>(EMPTY);

/** First paint is signed out. The session route is private and does not mark public HTML as uncacheable. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession>(EMPTY);
  useEffect(() => {
    let active = true;
    fetch(withBasePath("/api/auth/session"), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() as Promise<ClientSession> : null))
      .then((body) => {
        if (active && body?.signedIn) setSession(body);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientSession {
  return useContext(SessionContext);
}
