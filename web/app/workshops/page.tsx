import { WORKSHOPS } from "../../lib/mock";

export default function WorkshopsPage() {
  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">мастерские · 180 студий</div>
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

        <div className="workshops-grid">
          {WORKSHOPS.map((w) => (
            <a key={w.id} href={`/workshops/${w.id}`} className="ws-card">
              <div className="ws-cover" style={{ backgroundImage: `url('${w.cover}')` }}>
                {w.is_boosted && <div className="ws-boost">🔥 BOOST</div>}
                {w.is_pro && <div className="ws-pro">PRO</div>}
                <div className="ws-type">{w.type}</div>
              </div>
              <div className="ws-body">
                <div className="ws-name">{w.name}</div>
                <div className="ws-loc">📍 {w.city} · {w.eta}</div>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 10px", lineHeight: 1.5 }}>
                  {w.description}
                </p>
                <div className="ws-stats">
                  <div><b>★ {w.rating}</b><span>Рейтинг</span></div>
                  <div><b>{w.orders}+</b><span>Заказов</span></div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
