import type { IconName } from "@/components/tv/Icon";

/** The one set of section names. Header, phone menu and tab bar all read this list. */
export const NAV = [
  { href: "/ballot", label: "My races", icon: "ballot" },
  { href: "/news", label: "News", icon: "news" },
  { href: "/finance", label: "Campaign money", icon: "money" },
  { href: "/search", label: "Search", icon: "search" },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: IconName }>;

export const HOME_NAV = { href: "/", label: "Home", icon: "home" } as const;

export const WHERE_TO_VOTE = "Where to vote";

/** Breadcrumb step back to My races at the saved county. */
export const MY_RACES_CRUMB = { href: "/ballot", label: "My races", yours: true } as const;
