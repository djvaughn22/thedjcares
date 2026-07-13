// Protected Daily Encouragement publishing admin (shared Daily Social
// Engine). Open /admin/social?key=SOCIAL_ADMIN_KEY — 404s without the key.
// "Choose another item" steps the deterministic rotation with ?offset=N.

import { notFound } from "next/navigation";
import AdminDailyPanel from "../../components/AdminDailyPanel";
import { buildDailyEncouragement, DJC_BRAND } from "../../lib/dailyEncouragement";
import { addDaysToDateKey, chicagoDateKey } from "../../lib/dailySocialCore";
import { missingCredentials, readPublishConfig } from "../../lib/instagramPublisherCore";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string | string[]; offset?: string | string[] }>;
};

const OTHER_BRAND_ADMINS = [
  { name: "CrossHeartPray", url: "https://crossheartpray.com/admin/social" },
  { name: "DontCloneMeTom", url: "https://dontclonemetom.com/admin/social" },
];

export default async function AdminSocialPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const providedKey = Array.isArray(resolved.key) ? resolved.key[0] : resolved.key;
  const adminKey = process.env.SOCIAL_ADMIN_KEY?.trim();

  if (!adminKey || providedKey !== adminKey) {
    notFound();
  }

  const offsetRaw = Array.isArray(resolved.offset) ? resolved.offset[0] : resolved.offset;
  const offset = Math.max(0, Number(offsetRaw) || 0);

  const today = chicagoDateKey();
  const tomorrow = addDaysToDateKey(today, 1);
  const config = readPublishConfig();
  const missing = missingCredentials(config);

  const days = [
    { label: "Today", daily: await buildDailyEncouragement(today, { offset }) },
    { label: "Tomorrow", daily: await buildDailyEncouragement(tomorrow, { offset }) },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-[#e8edf5]">
      <h1 className="text-2xl font-black">Daily Encouragement — Instagram admin</h1>

      <div className="mt-4 rounded-2xl border border-[#26324c] bg-[#141d2e] p-4 text-sm font-semibold leading-6 text-[#94a3b8]">
        <p>
          Destination account:{" "}
          <span className="text-[#e8edf5]">
            {config.accountId ? `…${config.accountId.slice(-4)}` : "not configured"}
          </span>
        </p>
        <p>
          Credentials:{" "}
          {missing.length ? (
            <span className="text-yellow-200">missing {missing.join(", ")}</span>
          ) : (
            <span className="text-[#A78BFA]">configured</span>
          )}
        </p>
        <p>
          Automatic publishing:{" "}
          {config.autopublishEnabled ? (
            <span className="text-[#A78BFA]">ENABLED</span>
          ) : (
            <span className="text-yellow-200">PAUSED (INSTAGRAM_AUTOPUBLISH_ENABLED)</span>
          )}
        </p>
        <p>
          Other brands:{" "}
          {OTHER_BRAND_ADMINS.map((brand, index) => (
            <span key={brand.name}>
              {index > 0 ? " · " : ""}
              <a className="text-[#A78BFA]" href={brand.url}>
                {brand.name}
              </a>
            </span>
          ))}{" "}
          (each needs its own key)
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="text-[#94a3b8]">Selection:</span>
        <a
          className={`rounded-full border border-[#26324c] px-4 py-1.5 ${offset === 0 ? "bg-[#A78BFA] text-[#0b1220]" : "bg-[#141d2e]"}`}
          href={`?key=${encodeURIComponent(adminKey)}`}
        >
          Rotation pick
        </a>
        <a
          className="rounded-full border border-[#26324c] bg-[#141d2e] px-4 py-1.5"
          href={`?key=${encodeURIComponent(adminKey)}&offset=${offset + 1}`}
        >
          Choose another item (#{offset + 1}) →
        </a>
      </div>

      {days.map(({ label, daily }) => (
        <section key={label} className="mt-8 rounded-3xl border border-[#26324c] bg-[#141d2e] p-5">
          <h2 className="text-lg font-black">
            {label} — {daily.post.fullDate}
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#94a3b8]">
            {daily.label}: {daily.item.title} — {daily.item.author}
            {" · "}
            <a className="text-[#A78BFA]" href={daily.sourceUrl} target="_blank" rel="noreferrer">
              source ↗
            </a>
            {" · "}
            <a className="text-[#A78BFA]" href={daily.post.pagePath}>
              archive page
            </a>
            {" · "}
            <a className="text-[#A78BFA]" href="/today">
              /today
            </a>
          </p>
          <AdminDailyPanel
            adminKey={adminKey}
            date={daily.post.date}
            caption={daily.post.caption}
            imagePath={daily.post.imagePath}
            imageFileName={daily.post.imageFileName}
            extraParams={offset ? { offset: String(offset) } : {}}
          />
        </section>
      ))}

      <p className="mt-6 text-xs font-semibold leading-5 text-[#94a3b8]">
        Version {DJC_BRAND.version}. Only DJ-curated library items can ever be
        selected; sources are re-verified before a real publish (YouTube via
        oEmbed). Duplicate posting is impossible — the account&apos;s own
        captions are the ledger.
      </p>
    </main>
  );
}
