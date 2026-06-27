import { getCostumes, type CostumeListItem } from "../../lib/api";
import { fmtPrice } from "../../lib/pricing";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

export default async function RentPage() {
  const costumes = (await getCostumes().catch(() => null)) || [];

  if (costumes.length === 0) {
    return (
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="crumbs">
          <a href="/">Главная</a><span className="sep">›</span><span className="cur">Прокат</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Прокат костюмов</h1>
          <a href="/rent/new" className="btn btn-primary btn-sm">+ Сдать костюм</a>
        </div>
        <ComingSoon icon="👗" title="Прокат костюмов"
          desc="Костюм дорогой, а носят 1–2 раза. Сдавайте готовые костюмы напрокат и берите чужие на съёмку или фестиваль." />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Прокат</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 6px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Прокат костюмов</h1>
        <a href="/rent/new" className="btn btn-primary btn-sm">+ Сдать костюм</a>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 24px" }}>
        Готовые костюмы напрокат — на съёмку, фестиваль или косплей-вечеринку. Оплата и залог — с владельцем напрямую.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
        {costumes.map((c: CostumeListItem) => (
          <a key={c.id} href={`/rent/${c.id}`} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ aspectRatio: "3/4", backgroundSize: "cover", backgroundPosition: "center",
              backgroundImage: `url('${c.image || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80"}')` }} />
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: c.status === "available" ? "var(--green)" : "var(--ink-dim)" }}>{c.status_display}</span>
                {c.size && <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{c.size}</span>}
              </div>
              <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 15, margin: "0 0 2px" }}>{c.title}</h3>
              {c.character && <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{c.character}</div>}
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>
                {c.price_day != null ? `${fmtPrice(c.price_day)}/сутки` : "Цена договорная"}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>📍 {c.city || "—"} · @{c.owner_name}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
