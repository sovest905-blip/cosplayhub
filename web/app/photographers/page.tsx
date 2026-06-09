export const dynamic = "force-dynamic";
import { getProfilesByRole, ROLE_DETAIL_FIELDS, fmtDetailValue } from "../../lib/api";

export default async function PhotographersPage() {
  const photographers = (await getProfilesByRole("photographer")) || [];
  const cfg = ROLE_DETAIL_FIELDS.photographer;

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">фотографы · {photographers.length}</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          Фотографы <span className="accent">косплея.</span>
        </h1>
        <p style={{ color: "var(--ink-dim)", maxWidth: 560, marginTop: 12 }}>
          Косплей-фотосеты, студийная и выездная съёмка — портфолио и цены в одном месте.
        </p>
        <div style={{ marginTop: 16 }}>
          <a href="/cabinet?tab=roles" className="btn btn-primary">+ Я фотограф</a>
        </div>
      </section>

      <section style={{ paddingTop: 32 }}>
        {photographers.length === 0 ? (
          <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18 }}>
            <div className="empty-glyph">◐</div>
            <p className="empty-title">Фотографов пока нет</p>
            <p className="empty-sub">Снимаешь косплей? Добавь роль «Фотограф» в кабинете — тебя найдут косплееры.</p>
            <a href="/cabinet?tab=roles" className="btn btn-ghost" style={{ marginTop: 8 }}>Стать фотографом →</a>
          </div>
        ) : (
          <div className="workshops-grid">
            {photographers.map((p) => {
              const d = p.role_details?.photographer || {};
              const price = fmtDetailValue(d.price_hour, " ₸/час");
              return (
                <a key={p.id} href={`/people/${p.id}`} className="ws-card">
                  <div className="ws-cover" style={{ backgroundImage: `url('${p.photos?.[0]?.url || p.photo}')` }}>
                    {price && <div className="ws-pro" style={{ background: "rgba(255,210,74,.9)", color: "#001" }}>{price}</div>}
                    <div className="ws-type">◐ {fmtDetailValue(d.shoot_types) || "Фотограф"}</div>
                  </div>
                  <div className="ws-body">
                    <div className="ws-name">{p.display_name}</div>
                    <div className="ws-loc">📍 {p.city}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {cfg.fields.filter((f) => f.key !== "shoot_types" && f.key !== "price_hour").map((f) => {
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
