import { redirect } from "next/navigation";

type PageProps = { searchParams: Promise<{ lane?: string }> };

/** Old address. The News Feed lives at /news. */
export default async function UpdatesPage({ searchParams }: PageProps) {
  const lane = (await searchParams).lane;
  redirect(lane === "reporting" ? "/news?lane=reporting" : "/news");
}
