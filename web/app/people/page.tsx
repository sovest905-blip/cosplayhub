import { PEOPLE } from "../../lib/mock";

async function fetchProfiles() {
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  try {
    const res = await fetch(`${base}/profiles/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.results as typeof PEOPLE;
  } catch {
    return null;
  }
}

export default async function PeoplePage() {
  const apiPeople = await fetchProfiles();
  const people = apiPeople && apiPeople.length > 0 ? apiPeople : PEOPLE;

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">каталог · {people.length} анкет</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          Косплееры <span className="accent">СНГ.</span>
        </h1>
      </section>

      <section style={{ paddingTop: 32 }}>
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
                style={{ backgroundImage: `url('${(p as any).photo || (p as any).avatar || ""}')` }}
              >
                {(p as any).available_for_work
                  ? <div className="person-avail">Свободен</div>
                  : (p as any).is_pro
                  ? <div className="person-badge pro">PRO</div>
                  : null}
              </div>
              <div className="person-info">
                <div className="person-name">
                  {(p as any).display_name}
                  {(p as any).is_verified && <span className="verified-mini">✓</span>}
                </div>
                <div className="person-meta">
                  <span>{(p as any).specialization || ((p as any).roles?.[0] ?? "Косплеер")}</span>
                  <span>{(p as any).city || "—"}</span>
                </div>
              </div>
              <div className="person-stats">
                <span>♥ {((p as any).followers ? ((p as any).followers / 1000).toFixed(1) + "k" : "0")}</span>
                <span>✧ {(p as any).looks ?? 0} образов</span>
                <span>{(p as any).experience ?? ""}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
