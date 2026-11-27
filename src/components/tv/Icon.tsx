import type { ReactNode } from "react";

/** Built on first render so importing a module that names icons never evaluates JSX. */
const iconPaths = () =>
  ({
    ext: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    right: <path d="m9 6 6 6-6 6" />,
    left: <path d="m15 6-6 6 6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    money: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
    ask: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
    flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
    bell: (
      <>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
        <path d="M10 21h4" />
      </>
    ),
    moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    dots: (
      <>
        <circle cx="5" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="19" cy="12" r="1.4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    ballot: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    news: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
    star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
    building: <path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M3 21h18" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
    check: <path d="m5 12 5 5 9-10" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    warn: (
      <>
        <path d="M12 3 2 20h20z" />
        <path d="M12 10v4M12 17v.5" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7.5v.5" />
      </>
    ),
    retry: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
    share: (
      <>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    send: <path d="M4 12 20 4l-6 16-3-7z" />,
  }) satisfies Record<string, ReactNode>;

let paths: ReturnType<typeof iconPaths> | null = null;

export type IconName = keyof ReturnType<typeof iconPaths>;

export function Icon({ name, size, className }: { name: IconName; size?: "xs" | "sm" | "lg"; className?: string }) {
  const classes = ["ic", size, className].filter(Boolean).join(" ");
  return (
    <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(paths ??= iconPaths())[name]}
    </svg>
  );
}
