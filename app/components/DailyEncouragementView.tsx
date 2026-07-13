// Daily Encouragement page body — used by /today (live) and /today/[date]
// (stable archive; selection is a deterministic library rotation, so dated
// pages reproduce exactly). Everything comes from buildDailyEncouragement's
// single authoritative object.

import EncouragementActions from "./EncouragementActions";
import type { DailyEncouragement } from "../lib/dailyEncouragement";

export default function DailyEncouragementView({
  daily,
  isArchive,
}: {
  daily: DailyEncouragement;
  isArchive: boolean;
}) {
  const { item, label, post, embedUrl, sourceUrl } = daily;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#e8edf5]">
      <header className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#A78BFA]">
          {label}
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{post.fullDate}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-[#94a3b8]">
          One hand-picked piece of encouragement from TheDJCares library every
          day. This page always matches the day&apos;s Instagram post.
        </p>
        {isArchive ? (
          <p className="mt-4">
            <a href="/today" className="font-bold text-[#A78BFA]">
              See today&apos;s pick →
            </a>
          </p>
        ) : null}
      </header>

      <section className="mt-8 rounded-3xl border border-[#26324c] bg-[#141d2e] p-6 text-center">
        <h2 className="text-2xl font-black sm:text-3xl">{item.title}</h2>
        <p className="mt-2 text-base font-bold text-[#A78BFA]">{item.author}</p>
        {item.summary ? (
          <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-[#94a3b8]">
            {item.summary}
          </p>
        ) : null}

        {embedUrl ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#26324c]">
            <iframe
              src={embedUrl}
              title={item.title}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : null}

        <p className="mt-4 text-xs font-semibold text-[#94a3b8]">
          {item.author} · shared with attribution — the source above is the
          authorized home for this content.
        </p>
      </section>

      <div className="mt-8">
        <EncouragementActions
          contentId={item.id}
          label={label}
          title={item.title}
          pageUrl={`https://thedjcares.com${post.pagePath}`}
          sourceUrl={sourceUrl}
          cardPath={post.imagePath}
          cardFileName={post.imageFileName}
        />
      </div>

      <p className="mt-8 text-center text-xs font-semibold leading-5 text-[#94a3b8]">
        Follow Jesus. Love God. Pray. · A new pick lands every day at midnight
        Central Time. Stable link for this one:{" "}
        <a className="text-[#A78BFA]" href={post.pagePath}>
          thedjcares.com{post.pagePath}
        </a>
      </p>
    </main>
  );
}
