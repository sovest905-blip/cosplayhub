export const dynamic = "force-dynamic";
import { getProfiles, fmtCount, type Person } from "../../lib/api";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.role) params.set("role", sp.role);
  if (sp.q) params.set("q", sp.q);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const people: Person[] = (await getProfiles(qs)) || [];

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">каталог · {people.length} анкет</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          {sp.role === "photo" ? <>Фотографы <span className="accent">СНГ.</span></> : <>Косплееры <span className="accent">СНГ.</span></>}
        </h1>
      </section>

      <section style={{ paddingTop: 32 }}>
        <div className="filter-bar">
          <a href="/people" className={`chip${!sp.role && !sp.q ? " on" : ""}`}>Все</a>
          <a href="/people?available_for_work=true" className="chip">Открыты к сотрудничеству</a>
          <a href="/people?role=photo" className={`chip${sp.role === "photo" ? " on" : ""}`}>Фотографы</a>
        </div>

        {people.length === 0 && (
          <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18, marginTop: 8 }}>
            <div className="empty-glyph">◇</div>
            <p className="empty-title">{sp.q ? "Ничего не найдено" : "Анкет пока нет"}</p>
            <p className="empty-sub">
              {sp.q ? "Попробуй изменить запрос." : "Первые участники уже регистрируются. Загляни позже или заполни свою анкету."}
            </p>
            {!sp.q && <a href="/cabinet?tab=roles" className="btn btn-ghost" style={{ marginTop: 8 }}>Заполнить анкету →</a>}
          </div>
        )}

        <div className="people-grid">
          {people.map((p) => (
            <a key={p.id} href={`/people/${p.id}`} className="person" style={{ color: "inherit" }}>
              <div className="person-img" style={{ backgroundImage: `url('${p.photo}')` }}>
                {p.available_for_work
                  ? <div className="person-avail">Открыт к сотрудничеству</div>
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
                <span>♥ {fmtCount(p.followers)}</span>
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
