import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoneyView } from "@/components/tv/MoneyView";
import { allPeople, personView } from "@/lib/tv/people";

export const revalidate = 3600;
export const runtime = "nodejs";

type PageProps = { params: Promise<{ candidateId: string }> };

export function generateStaticParams() {
  return allPeople()
    .filter((person) => person.funding)
    .map((person) => ({ candidateId: person.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const person = personView((await params).candidateId);
  if (!person?.funding) return { title: "Campaign money" };
  return {
    alternates: { canonical: `/finance/candidates/${person.id}` },
    title: `Who gives to ${person.name}`,
    description: `Who gives to ${person.name}’s campaign, from Federal Election Commission reports.`,
  };
}

export default async function MoneyPage({ params }: PageProps) {
  const person = personView((await params).candidateId);
  if (!person?.funding) notFound();
  return <MoneyView person={{ ...person, funding: person.funding }} />;
}
