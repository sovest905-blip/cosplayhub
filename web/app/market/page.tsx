import { getPublicListings, type PublicListing } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const items = (await getPublicListings("sell,buy").catch(() => null)) || [];

  if (items.length === 0) {
    return (
      <ComingSoon icon="✄" title="Барахолка"
        desc="Продажа и обмен б/у костюмов, париков, реквизита и материалов. Размести объявление в кабинете." />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Барахолка</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Барахолка</h1>
        <a href="/cabinet?tab=listings" className="btn btn-primary btn-sm">+ Разместить</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {items.map((l: PublicListing) => (
          <div key={l.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: l.type === "sell" ? "var(--green)" : "var(--accent-2)" }}>{l.type_display}</span>
              {l.price ? <span style={{ fontSize: 13, fontWeight: 700 }}>{l.price.toLocaleString("ru-RU")} ₸</span> : null}
            </div>
            <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{l.title}</h3>
            {l.description && <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 8px", lineHeight: 1.5 }}>{l.description.slice(0, 120)}{l.description.length > 120 ? "…" : ""}</p>}
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>📍 {l.city || "—"} · @{l.owner}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
