import { getPublicListings, type PublicListing } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const items = (await getPublicListings("job,collab").catch(() => null)) || [];

  if (items.length === 0) {
    return (
      <ComingSoon icon="⚒" title="Слоты и коллабы"
        desc="Поиск специалистов и косплей-коллаборации: ищу фотографа, ищу пару на сет и т.д. Размести запрос в кабинете." />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Слоты и коллабы</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Слоты и коллабы</h1>
        <a href="/cabinet?tab=listings" className="btn btn-primary btn-sm">+ Разместить</a>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((l: PublicListing) => (
          <div key={l.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>
                <span style={{ fontSize: 11, color: "var(--accent-4)", marginRight: 8 }}>{l.type_display}</span>{l.title}
              </h3>
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>📍 {l.city || "—"} · @{l.owner}</span>
            </div>
            {l.description && <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 0", lineHeight: 1.5 }}>{l.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
