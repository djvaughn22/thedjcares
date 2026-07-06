// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — Open Mirror satellite header (Stage A of the reusable-
// component plan, docs/openmirror-audit/04-reusable-component-plan.md).
//
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorNav.tsx
// Then run: scripts/sync-ui.sh (copies this file into every satellite repo,
// overwriting the copies there — never edit the copies in site repos).
//
// No ☰ menu on satellites (DJ, 2026-07-06): the wordmark always links to the
// hub and About is always in the shared footer. Only the hub and
// CrossHeartPray keep a menu (hub: src/components/OpenMirrorNav.tsx).
// ─────────────────────────────────────────────────────────────────────────────

export default function OpenMirrorNav() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #26324c", background: "#0b1220" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
        <a href="https://openmirrorllc.com" style={{ display: "inline-flex", alignItems: "baseline", gap: 8, fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", color: "#e8edf5", textDecoration: "none" }}>
          <span>Open Mirror LLC</span>
        </a>
      </div>
    </header>
  );
}
