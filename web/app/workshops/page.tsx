import { WORKSHOPS } from "../../lib/mock";

async function fetchWorkshops() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workshops/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.results as typeof WORKSHOPS;
  } catch {
    return null;
  }
}

export default async function WorkshopsPage() {
  const apiWorkshops = await fetchWorkshops();
  const workshops = apiWorkshops && apiWorkshops.length > 0 ? apiWorkshops : WORKSHOPS;

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">мастерские · {workshops.length} студий</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          Мастерские <span className="accent">СНГ.</span>
        </h1>
      </section>

      <section style={{ paddingTop: 32 }}>
        <div className="filter-bar">
          <button className="chip on">Все</button>
          <button className="chip">3D-печать</button>
          <button className="chip">EVA-броня</button>
          <button className="chip">Пошив</button>
          <button className="chip">Парики</button>
          <button className="chip">Фотосъёмка</button>
          <button className="chip">PRO</button>
        </div>

        {workshops.length === 0 && (
          <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18, marginTop: 8 }}>
            <div className="empty-glyph">◆</div>
            <p className="empty-title">Мастерских пока нет</p>
            <p className="empty-sub">Первые мастера уже регистрируются. Загляни позже.</p>
          </div>
        )}

        <div className="workshops-grid">
          {workshops.map((w) => (
            <a key={w.id} href={`/workshops/${w.id}`} className="ws-card">
              <div className="ws-cover" style={{ backgroundImage: `url('${(w as any).cover || ""}')` }}>
                {(w as any).is_boosted && <div className="ws-boost">🔥 BOOST</div>}
                {(w as any).is_pro && <div className="ws-pro">PRO</div>}
                <div className="ws-type">{(w as any).type}</div>
              </div>
              <div className="ws-body">
                <div className="ws-name">{w.name}</div>
                <div className="ws-loc">📍 {w.city} · {(w as any).eta || "—"}</div>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 10px", lineHeight: 1.5 }}>
                  {(w as any).description || (w as any).about || ""}
                </p>
                <div className="ws-stats">
                  <div><b>★ {(w as any).rating ?? "—"}</b><span>Рейтинг</span></div>
                  <div><b>{(w as any).orders ?? (w as any).orders_count ?? 0}+</b><span>Заказов</span></div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
