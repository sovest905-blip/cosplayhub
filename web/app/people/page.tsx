export const dynamic = "force-dynamic";
import { PEOPLE } from "../../lib/mock";
import { getProfiles, type Person } from "../../lib/api";

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

  const api = await getProfiles(qs);
  // Реальные профили из БД; если их нет — демонстрационные (mock) для живости беты
  const people: Person[] = api && api.length > 0 ? api : (PEOPLE as unknown as Person[]);
  const isReal = !!(api && api.length > 0);

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">каталог · {people.length} анкет{isReal ? "" : " · демо"}</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          {sp.role === "photo" ? <>Фотографы <span className="accent">СНГ.</span></> : <>Косплееры <span className="accent">СНГ.</span></>}
        </h1>
      </section>

      <section style={{ paddingTop: 32 }}>
        <div className="filter-bar">
          <a href="/people" className={`chip${!sp.role && !sp.q ? " on" : ""}`}>Все</a>
          <a href="/people?available_for_work=true" className="chip">Свободны</a>
          <a href="/people?role=photo" className={`chip${sp.role === "photo" ? " on" : ""}`}>Фотографы</a>
        </div>

        <div className="people-grid">
          {people.map((p) => (
            <a key={p.id} href={`/people/${p.id}`} className="person" style={{ color: "inherit" }}>
              <div className="person-img" style={{ backgroundImage: `url('${p.photo}')` }}>
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
                <span>♥ {p.followers ? (p.followers / 1000).toFixed(1) + "k" : "0"}</span>
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
