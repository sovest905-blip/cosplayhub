export const dynamic = "force-dynamic";
import { getProfilesByRole, ROLE_DETAIL_FIELDS, fmtDetailValue } from "../../lib/api";

export default async function ShopsPage() {
  const shops = (await getProfilesByRole("shop")) || [];
  const cfg = ROLE_DETAIL_FIELDS.shop;

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">магазины · {shops.length}</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          Магазины <span className="accent">СНГ.</span>
        </h1>
        <p style={{ color: "var(--ink-dim)", maxWidth: 560, marginTop: 12 }}>
          Ткани, линзы, парики, материалы для брони и готовые костюмы — от косплей-сообщества.
        </p>
        <div style={{ marginTop: 16 }}>
          <a href="/cabinet?tab=roles" className="btn btn-primary">+ Стать магазином</a>
        </div>
      </section>

      <section style={{ paddingTop: 32 }}>
        {shops.length === 0 ? (
          <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18 }}>
            <div className="empty-glyph">⌂</div>
            <p className="empty-title">Магазинов пока нет</p>
            <p className="empty-sub">Продаёшь товары для косплея? Добавь роль «Магазин» в кабинете — окажешься здесь первым.</p>
            <a href="/cabinet?tab=roles" className="btn btn-ghost" style={{ marginTop: 8 }}>Стать магазином →</a>
          </div>
        ) : (
          <div className="workshops-grid">
            {shops.map((p) => {
              const d = p.role_details?.shop || {};
              const name = fmtDetailValue(d.shop_name) || p.display_name;
              return (
                <a key={p.id} href={`/people/${p.id}`} className="ws-card">
                  <div className="ws-cover" style={{ backgroundImage: `url('${p.photo}')` }}>
                    {fmtDetailValue(d.delivery_cis) && <div className="ws-pro" style={{ background: "rgba(124,249,255,.9)", color: "#001" }}>Доставка СНГ</div>}
                    <div className="ws-type">⌂ Магазин</div>
                  </div>
                  <div className="ws-body">
                    <div className="ws-name">{name}</div>
                    <div className="ws-loc">📍 {p.city}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {cfg.fields.filter((f) => f.key !== "shop_name").map((f) => {
                        const val = fmtDetailValue(d[f.key], f.suffix);
                        if (!val) return null;
                        return (
                          <div key={f.key} style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                            <span style={{ color: "var(--ink)" }}>{f.label}:</span> {val}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
