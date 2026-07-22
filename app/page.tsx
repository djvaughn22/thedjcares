// Thin server wrapper: the page itself lives in HomeClient.tsx.
// This layer only turns share deep links (/?play=…, /?ministry=…, /?church=…)
// into real page metadata so a shared link carries the item's own title.
//
// Canonical + og:url are rendered in the body (React hoists them into <head>)
// because Next's metadata resolver strips query strings from URLs, and the
// query IS the deep link here.

import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { getCurrentAccessMode } from "./lib/featureAccess";
import {
  findShareChurch,
  findShareMedia,
  findShareMinistry,
  mediaTypeLabel,
  PRODUCTION_ORIGIN,
} from "./lib/shareLinks";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// What a deep link points at, described with the item's own verified data.
function resolveDeepLink(params: Record<string, string | string[] | undefined>) {
  const play = first(params.play);
  const item = play ? findShareMedia(play) : undefined;
  if (item) {
    return {
      title: item.title,
      description: item.summary ?? `${mediaTypeLabel(item)} by ${item.author} on The DJ Cares.`,
      canonical: `${PRODUCTION_ORIGIN}/?play=${encodeURIComponent(item.id)}`,
    };
  }

  const ministryKey = first(params.ministry);
  const ministry = ministryKey ? findShareMinistry(ministryKey) : undefined;
  if (ministry) {
    return {
      title: ministry.name,
      description: ministry.purpose,
      canonical: `${PRODUCTION_ORIGIN}/?ministry=${encodeURIComponent(ministry.key)}`,
    };
  }

  const churchId = first(params.church);
  const church = churchId ? findShareChurch(churchId) : undefined;
  if (church) {
    return {
      title: church.name,
      description: `${church.name} — ${church.city}, ${church.region} on The DJ Cares.`,
      canonical: `${PRODUCTION_ORIGIN}/?church=${encodeURIComponent(church.id)}`,
    };
  }

  return null;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const link = resolveDeepLink(await searchParams);
  // No (or unknown) deep link — the layout's default metadata stands.
  if (!link) return {};
  return {
    title: link.title,
    description: link.description,
    openGraph: { title: link.title, description: link.description, siteName: "TheDJCares", type: "website" },
  };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const link = resolveDeepLink(await searchParams);
  return (
    <>
      {link && <link rel="canonical" href={link.canonical} />}
      {link && <meta property="og:url" content={link.canonical} />}
      {/* Server decides whether the Digital DJ card exists at all. */}
      <HomeClient digitalDjEnabled={getCurrentAccessMode("digital_dj") !== "off"} />
    </>
  );
}
