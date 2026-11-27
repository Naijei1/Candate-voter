"use client";

import { useEffect, useState } from "react";

export function Toast() {
  const [message, setMessage] = useState("");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onToast = (event: Event) => {
      setMessage(String((event as CustomEvent).detail ?? ""));
      setShown(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(false), 2600);
    };
    window.addEventListener("tv:toast", onToast);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("tv:toast", onToast);
    };
  }, []);

  return (
    <div className={shown ? "toast show" : "toast"} role="status" aria-live="polite">
      {message}
    </div>
  );
}
