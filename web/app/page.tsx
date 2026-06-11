import { PEOPLE, WORKSHOPS, EVENTS } from "../lib/mock";
import { getProfiles, getWorkshops, getEvents, fmtCount } from "../lib/api";

export const dynamic = "force-dynamic";

type Stats = { cosplayers: number; workshops: number; shops: number; photographers: number; cities: number };

async function fetchStats(): Promise<Stats> {
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://web:8000/api/v1";
  try {
    const res = await fetch(`${base}/stats/`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch { /* API недоступен — покажем нули */ }
  return { cosplayers: 0, workshops: 0, shops: 0, photographers: 0, cities: 0 };
}

export default async function HomePage() {
  const [stats, apiPeople, apiWs, apiEvents] = await Promise.all([
    fetchStats(),
    getProfiles("?role=cosplayer").catch(() => null),
    getWorkshops().catch(() => null),
    getEvents().catch(() => null),
  ]);
  // Реальные данные из БД; фолбэк на мок, пока пусто.
  const peopleList: any[] = apiPeople && apiPeople.length ? apiPeople : PEOPLE;
  const wsList: any[] = apiWs && apiWs.length ? apiWs : WORKSHOPS;
  const evList: any[] = apiEvents && apiEvents.length ? apiEvents : EVENTS;
  return (
    <>
      {/* HERO */}
      <div className="wrap">
        <section className="hero">
          <div className="eyebrow">платформа · казахстан и снг · beta</div>
          <h1 className="huge">
            Один <span className="accent">хаб</span>
            <br />для всего <span className="stroke">косплея</span>
            <br />в СНГ.
          </h1>
          <p className="hero-sub">
            Косплееры, мастерские, магазины, фотографы, локации, гайды и сходки —
            в одном месте. Безопасные сделки, подписки фанатов, аналитика, мессенджер — всё внутри.
          </p>
          <div className="hero-actions">
            <a href="/auth/register" className="btn btn-primary btn-big">
              Присоединиться к бете →
            </a>
            <a href="/pro" className="btn btn-ghost btn-big">Pro-тарифы</a>
          </div>
          <div className="hero-stats">
            <div><div className="stat-num">{stats.cosplayers}</div><div className="stat-label">Косплееров</div></div>
            <div><div className="stat-num">{stats.workshops}</div><div className="stat-label">Мастерских</div></div>
            <div><div className="stat-num">{stats.shops}</div><div className="stat-label">Магазинов</div></div>
            <div><div className="stat-num">{stats.photographers}</div><div className="stat-label">Фотографов</div></div>
            <div><div className="stat-num">{stats.cities}</div><div className="stat-label">Городов</div></div>
          </div>
        </section>
      </div>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-track">
          <span>3D-печать</span>
          <span>EVA</span>
          <span>Пошив</span>
          <span>Парики</span>
          <span>Линзы</span>
          <span>Фотосеты</span>
          <span>Барахолка</span>
          <span>Команды</span>
          <span>3D-печать</span>
          <span>EVA</span>
          <span>Пошив</span>
          <span>Парики</span>
          <span>Линзы</span>
          <span>Фотосеты</span>
          <span>Барахолка</span>
          <span>Команды</span>
        </div>
      </div>

      <div className="wrap">
        {/* CURATED */}
        <section>
          <div className="section-head">
            <h2 className="title">Выбор редакции.</h2>
            <p>Лучшее за неделю.</p>
          </div>
          <div className="curated">
            <a href="/people/1" className="cur-look">
              <div className="cur-tag">★ Образ недели</div>
              <div
                className="cur-img"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=900&q=80')" }}
              />
              <div>
                <div className="cur-title">Zeri от ZAKOS — League of Legends</div>
                <div className="cur-meta">12 400 просмотров · 890 ♥</div>
              </div>
            </a>
            <a href="/workshops/1" className="cur-ws">
              <div className="cur-tag">◆ Мастерская месяца</div>
              <div
                className="cur-img"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1631544114551-e3f12e3e1f99?w=600&q=80')" }}
              />
              <div>
                <div className="cur-title">7G PRINT LAB</div>
                <div className="cur-meta">240+ заказов · ★ 4.9</div>
              </div>
            </a>
            <a href="/events" className="cur-ev">
              <div className="cur-tag">◈ Сходка дня</div>
              <div
                className="cur-img"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=600&q=80')" }}
              />
              <div>
                <div className="cur-title">Edgerunners сет — Алматы</div>
                <div className="cur-meta">12 апреля · 23 идут</div>
              </div>
            </a>
          </div>
        </section>

        {/* PEOPLE */}
        <section>
          <div className="section-head">
            <h2 className="title">Косплееры.</h2>
            <a href="/people" className="section-link">Все →</a>
          </div>
          <div className="people-grid">
            {peopleList.slice(0, 4).map((p) => (
              <a key={p.id} href={`/people/${p.id}`} className="person">
                <div
                  className="person-img"
                  style={{ backgroundImage: `url('${p.photo}')` }}
                >
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

        {/* WORKSHOPS */}
        <section>
          <div className="section-head">
            <h2 className="title">Мастерские.</h2>
            <a href="/workshops" className="section-link">Все →</a>
          </div>
          <div className="workshops-grid">
            {wsList.slice(0, 3).map((w) => (
              <a key={w.id} href={`/workshops/${w.id}`} className="ws-card">
                <div className="ws-cover" style={{ backgroundImage: `url('${w.cover}')` }}>
                  {w.is_boosted && <div className="ws-boost">🔥 BOOST</div>}
                  {w.is_pro && <div className="ws-pro">PRO</div>}
                  <div className="ws-type">{w.type}</div>
                </div>
                <div className="ws-body">
                  <div className="ws-name">{w.name}</div>
                  <div className="ws-loc">📍 {w.city} · {w.eta}</div>
                  <div className="ws-stats">
                    <div><b>{Number(w.rating) > 0 ? `★ ${w.rating}` : "—"}</b><span>{Number(w.rating) > 0 ? "Рейтинг" : "Нет отзывов"}</span></div>
                    <div><b>{w.orders}+</b><span>Заказов</span></div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* EVENTS */}
        <section>
          <div className="section-head">
            <h2 className="title">Ближайшие события.</h2>
            <a href="/events" className="section-link">Все →</a>
          </div>
          <div className="ev-list">
            {evList.slice(0, 4).map((e) => (
              <a key={e.id} href="/events" className="ev">
                <div className="ev-date">
                  <b>{e.day}</b>
                  <span>{e.month}</span>
                </div>
                <div className="ev-info">
                  <h4>{e.title}</h4>
                  <p>{e.city}</p>
                </div>
                <div className="ev-going">
                  <b>{e.going}</b>
                  идут
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="cta-strip">
          <h2>Вступай в бету первым.</h2>
          <p>
            Закрытый запуск — только по инвайтам. Первые 200 участников получают
            Pro-статус бесплатно на 3 месяца.
          </p>
          <a href="/auth/register" className="btn btn-primary btn-big">
            Запросить инвайт →
          </a>
        </div>
      </div>
    </>
  );
}
