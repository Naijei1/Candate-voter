"use client";

import { useEffect, useState } from "react";

/** Shown in the installed app or browser when the connection drops. */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="wrap offline" role="status">
      <div className="empty sm">
        <p className="empty-t">You are offline.</p>
        <p>Pages you opened before are saved on this device. New data loads when you reconnect.</p>
      </div>
    </div>
  );
}
