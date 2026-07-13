// Stable dated archive: thedjcares.com/today/2026-07-12. Selection is a
// deterministic library rotation, so dated pages reproduce exactly.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DailyEncouragementView from "../../components/DailyEncouragementView";
import { buildDailyEncouragement, DJC_BRAND } from "../../lib/dailyEncouragement";
import { chicagoDateKey, isValidDateKey } from "../../lib/dailySocialCore";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ date: string }> };

function resolveArchiveDate(date: string): string | null {
  if (!isValidDateKey(date)) return null;
  if (date < DJC_BRAND.startDate) return null;
  if (date > chicagoDateKey()) return null;
  return date;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const resolved = resolveArchiveDate(date);
  if (!resolved) return { title: "Daily Encouragement" };

  const daily = await buildDailyEncouragement(resolved);
  return {
    title: `${daily.label}: ${daily.item.title} (${resolved})`,
    description: `${daily.item.title} — ${daily.item.author}.`,
  };
}

export default async function TodayArchivePage({ params }: PageProps) {
  const { date } = await params;
  const resolved = resolveArchiveDate(date);
  if (!resolved) notFound();

  const daily = await buildDailyEncouragement(resolved);
  return <DailyEncouragementView daily={daily} isArchive={resolved !== chicagoDateKey()} />;
}
