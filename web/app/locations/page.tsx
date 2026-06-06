export const dynamic = "force-dynamic";
import { getProfilesByRole, ROLE_DETAIL_FIELDS, fmtDetailValue } from "../../lib/api";

export default async function LocationsPage() {
  const locations = (await getProfilesByRole("location")) || [];
  const cfg = ROLE_DETAIL_FIELDS.location;

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">локации · {locations.length}</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          Локации <span className="accent">для съёмок.</span>
        </h1>
        <p style={{ color: "var(--ink-dim)", maxWidth: 560, marginTop: 12 }}>
          Фотостудии, интерьеры и площадки под косплей-сеты — аренда по часам.
        </p>
        <div style={{ marginTop: 16 }}>
          <a href="/cabinet?tab=roles" className="btn btn-primary">+ Сдать локацию</a>
        </div>
      </section>

      <section style={{ paddingTop: 32 }}>
        {locations.length === 0 ? (
          <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18 }}>
            <div className="empty-glyph">⌖</div>
            <p className="empty-title">Локаций пока нет</p>
            <p className="empty-sub">Есть студия или площадка? Добавь роль «Локация» в кабинете — её увидят косплееры.</p>
            <a href="/cabinet?tab=roles" className="btn btn-ghost" style={{ marginTop: 8 }}>Сдать локацию →</a>
          </div>
        ) : (
          <div className="workshops-grid">
            {locations.map((p) => {
              const d = p.role_details?.location || {};
              const price = fmtDetailValue(d.price_hour, " ₸/час");
              return (
                <a key={p.id} href={`/people/${p.id}`} className="ws-card">
                  <div className="ws-cover" style={{ backgroundImage: `url('${p.photo}')` }}>
                    {price && <div className="ws-pro" style={{ background: "rgba(255,210,74,.9)", color: "#001" }}>{price}</div>}
                    <div className="ws-type">⌖ {fmtDetailValue(d.loc_type) || "Локация"}</div>
                  </div>
                  <div className="ws-body">
                    <div className="ws-name">{p.display_name}</div>
                    <div className="ws-loc">📍 {p.city}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {cfg.fields.filter((f) => f.key !== "loc_type" && f.key !== "price_hour").map((f) => {
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
