import Link from "next/link";

// Renders inside the root layout, so the family bar, footer, and theme
// all carry through. Keep the copy plain.
export default function NotFound() {
  return (
    <main style={{ minHeight: "55vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 20px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8" }}>404</p>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#e8edf5" }}>Page not found</h1>
      <p style={{ margin: 0, fontSize: 15, color: "#94a3b8" }}>That page doesn&rsquo;t exist here.</p>
      <Link
        href="/"
        style={{ marginTop: 8, display: "inline-flex", alignItems: "center", borderRadius: 50, border: "1px solid #26324c", background: "#141d2e", color: "#e8edf5", padding: "12px 22px", fontSize: 14, fontWeight: 900, textDecoration: "none", minHeight: 44 }}
      >
        Back to the home page
      </Link>
    </main>
  );
}
