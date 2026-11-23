import Link from "next/link";
import { AccountMenu } from "@/components/site/AccountMenu";
import { HeaderFrame } from "@/components/site/HeaderFrame";
import { brand } from "@/content/brand";
import { loadSiteCopy } from "@/lib/content/store";

export async function SiteHeader() {
  const copy = await loadSiteCopy();
  return (
    <HeaderFrame
      wordmark={
        <Link href="/" className="brand">
          {copy.logoKey ? <img src="/media/logo" alt="" width={28} height={28} /> : <span className="brand-flag" aria-hidden="true" />}
          <span className="brand-name">{brand.name}</span>
        </Link>
      }
      account={<AccountMenu />}
    />
  );
}
