import { PEOPLE } from "../../lib/mock";

// Заглушка: когда придут реальные данные из API — заменить на fetch
const people = PEOPLE;

export default function PeoplePage() {
  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">каталог · 1 248 анкет</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          Косплееры <span className="accent">СНГ.</span>
        </h1>
      </section>

      <section style={{ paddingTop: 32 }}>
        {/* Filters */}
        <div className="filter-bar">
          <button className="chip on">Все</button>
          <button className="chip">Свободны</button>
          <button className="chip">PRO</button>
          <button className="chip">Верифицированы</button>
          <button className="chip">Алматы</button>
          <button className="chip">Астана</button>
          <button className="chip">Бишкек</button>
          <button className="chip">Ташкент</button>
        </div>

        {people.length === 0 && (
          <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18, marginTop: 8 }}>
            <div className="empty-glyph">◉</div>
            <p className="empty-title">Косплееров пока нет</p>
            <p className="empty-sub">Сообщество только собирается. Зарегистрируйся первым — стань частью истории.</p>
            <a href="/auth/register" className="btn btn-primary" style={{ marginTop: 8 }}>Присоединиться →</a>
          </div>
        )}

        <div className="people-grid">
          {people.map((p) => (
            <a key={p.id} href={`/people/${p.id}`} className="person" style={{ color: "inherit" }}>
              <div
                className="person-img"
                style={{ backgroundImage: `url('${p.photo}')` }}
              >
                {p.available_for_work
                  ? <div className="person-avail">Свободен</div>
                  : p.is_pro
                  ? <div className="person-badge pro">PRO</div>
                  : null}
              </div>
              <div className="person-info">
                <div className="person-name">
                  {p.display_name}
                  {p.is_verified && <span className="verified-mini">✓</span>}
                </div>
                <div className="person-meta">
                  <span>{p.specialization}</span>
                  <span>{p.city}</span>
                </div>
              </div>
              <div className="person-stats">
                <span>♥ {(p.followers / 1000).toFixed(1)}k</span>
                <span>✧ {p.looks} образов</span>
                <span>{p.experience}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
