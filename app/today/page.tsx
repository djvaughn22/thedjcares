// Permanent Instagram bio link: thedjcares.com/today — always resolves to
// the current day's pick from the curated Encouragement Library.

import type { Metadata } from "next";
import DailyEncouragementView from "../components/DailyEncouragementView";
import { buildDailyEncouragement } from "../lib/dailyEncouragement";
import { chicagoDateKey } from "../lib/dailySocialCore";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const daily = await buildDailyEncouragement(chicagoDateKey());
  return {
    title: `${daily.label}: ${daily.item.title}`,
    description: `${daily.item.title} — ${daily.item.author}. ${daily.item.summary ?? ""}`.slice(0, 160),
    openGraph: { images: [{ url: daily.post.imagePath, width: 1080, height: 1350 }] },
  };
}

export default async function TodayPage() {
  const daily = await buildDailyEncouragement(chicagoDateKey());
  return <DailyEncouragementView daily={daily} isArchive={false} />;
}
