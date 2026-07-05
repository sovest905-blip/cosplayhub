import {
  getProfiles, getWorkshops, getEvents, fmtCount,
  getCurated, getCategories, getNews, getProfilesByRole,
  ROLE_DETAIL_FIELDS, fmtDetailValue, type Category, type NewsItem,
} from "../lib/api";

// Категории — декоративная лента тем. Если админ не задал свои — показываем базовый набор.
const FALLBACK_CATEGORIES = ["3D-печать", "EVA", "Пошив", "Парики", "Линзы", "Фотосеты", "Барахолка", "Команды"];
const CUR_CLASS: Record<string, string> = { look: "cur-look", workshop: "cur-ws", event: "cur-ev" };

// Пустой раздел → приглашение «Будь первым» (ведёт к созданию нужной роли).
function FirstCta({ glyph, title, sub, href, label }: {
  glyph: string; title: string; sub: string; href: string; label: string;
}) {
  return (
    <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18 }}>
      <div className="empty-glyph">{glyph}</div>
      <p className="empty-title">{title}</p>
      <p className="empty-sub">{sub}</p>
      <a href={href} className="btn btn-primary" style={{ marginTop: 8 }}>{label}</a>
    </div>
  );
}

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
  const [stats, apiPeople, apiWs, apiEvents, apiCurated, apiCategories, apiNews, apiShops] = await Promise.all([
    fetchStats(),
    getProfiles("?role=cosplayer").catch(() => null),
    getWorkshops().catch(() => null),
    getEvents().catch(() => null),
    getCurated().catch(() => null),
    getCategories().catch(() => null),
    getNews().catch(() => null),
    getProfilesByRole("shop").catch(() => null),
  ]);
  // Новости — из админки; блок на главной показываем только если есть хотя бы одна.
  const newsList: NewsItem[] = apiNews || [];
  // Только реальные данные из БД. Пусто — покажем «Будь первым», без фейка.
  const peopleList: any[] = apiPeople || [];
  const wsList: any[] = apiWs || [];
  const evList: any[] = apiEvents || [];
  const shopList: any[] = apiShops || [];
  // «Выбор редакции» — из админки; если ничего не заведено, блок не показываем.
  const curated = apiCurated || [];
  // Категории — из админки, иначе базовый набор тем (декоративная лента).
  const categories: string[] = apiCategories && apiCategories.length
    ? apiCategories.map((c: Category) => c.label) : FALLBACK_CATEGORIES;
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
          {/* дублируем список дважды — для бесшовной прокрутки */}
          {[...categories, ...categories].map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
      </div>

      <div className="wrap">
        {/* CURATED — показываем только если админ завёл карточки */}
        {curated.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="title">Выбор редакции.</h2>
            <p>Лучшее за неделю.</p>
          </div>
          <div className="curated">
            {curated.map((c) => {
              const inner = (
                <>
                  {c.tag && <div className="cur-tag">{c.tag}</div>}
                  {c.image && (
                    <div className="cur-img" style={{ backgroundImage: `url('${c.image}')` }} />
                  )}
                  <div>
                    <div className="cur-title">{c.title}</div>
                    {c.meta && <div className="cur-meta">{c.meta}</div>}
                  </div>
                </>
              );
              const cls = CUR_CLASS[c.style] || "cur-look";
              return c.link
                ? <a key={c.id} href={c.link} className={cls}>{inner}</a>
                : <div key={c.id} className={cls}>{inner}</div>;
            })}
          </div>
        </section>
        )}

        {/* NEWS + EVENTS — объединённый блок над косплеерами; показываем, если есть новости или события */}
        {(newsList.length > 0 || evList.length > 0) && (
        <section>
          <div className="section-head">
            <h2 className="title">Новости и события.</h2>
            <a href={newsList.length > 0 ? "/news" : "/events"} className="section-link">Все →</a>
          </div>

          {newsList.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18 }}>
            {newsList.slice(0, 3).map((n) => (
              <a key={n.id} href="/news" style={{
                display: "block", background: "var(--bg-2)", border: "1px solid var(--line)",
                borderRadius: 18, overflow: "hidden", color: "inherit",
              }}>
                {n.image && (
                  <div style={{
                    height: 150, backgroundImage: `url('${n.image}')`,
                    backgroundSize: "cover", backgroundPosition: "center",
                  }} />
                )}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {n.is_pinned && (
                      <span style={{
                        fontSize: 11, color: "var(--accent-3)", border: "1px solid rgba(255,210,74,.3)",
                        borderRadius: 20, padding: "2px 9px",
                      }}>📌 Закреплено</span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                      {new Date(n.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 17, margin: "0 0 6px", lineHeight: 1.25 }}>
                    {n.title}
                  </h3>
                  {n.body && (
                    <p style={{
                      color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.6, margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {n.body}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
          )}

          {evList.length > 0 && (
          <>
            <div className="section-head" style={{ marginTop: newsList.length > 0 ? 26 : 0 }}>
              <h3 className="title" style={{ fontSize: 20 }}>Ближайшие события</h3>
              <a href="/events" className="section-link">Все события →</a>
            </div>
            <div className="ev-list">
              {evList.slice(0, 4).map((e) => (
                <a key={e.id} href={`/events/${e.id}`} className="ev">
                  <div className="ev-date">
                    <b>{e.day}</b>
                    <span>{e.month}</span>
                  </div>
                  <div className="ev-info">
                    <h4>{e.title}</h4>
                    <p>{e.place ? `${e.place} · ` : ""}{e.city}</p>
                  </div>
                  <div className="ev-going">
                    <b>{e.going_total ?? e.going}</b>
                    идут
                  </div>
                </a>
              ))}
            </div>
          </>
          )}
        </section>
        )}

        {/* PEOPLE */}
        <section>
          <div className="section-head">
            <h2 className="title">Косплееры.</h2>
            <a href="/people" className="section-link">Все →</a>
          </div>
          {peopleList.length === 0 ? (
            <FirstCta glyph="◇" title="Стань первым косплеером"
              sub="Анкет пока нет — заполни свою и попади в каталог платформы."
              href="/cabinet?tab=roles" label="Заполнить анкету →" />
          ) : (
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
          )}
        </section>

        {/* WORKSHOPS */}
        <section>
          <div className="section-head">
            <h2 className="title">Мастерские.</h2>
            <a href="/workshops" className="section-link">Все →</a>
          </div>
          {wsList.length === 0 ? (
            <FirstCta glyph="◆" title="Открой первую мастерскую"
              sub="Мастерских пока нет — добавь свою и принимай заказы от косплееров."
              href="/cabinet?tab=roles&new=workshop" label="Создать мастерскую →" />
          ) : (
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
          )}
        </section>

        {/* SHOPS */}
        <section>
          <div className="section-head">
            <h2 className="title">Магазины.</h2>
            <a href="/shops" className="section-link">Все →</a>
          </div>
          {shopList.length === 0 ? (
            <FirstCta glyph="⌂" title="Открой первый магазин"
              sub="Магазинов пока нет — продаёшь ткани, линзы, парики или готовые костюмы? Добавь роль «Магазин»."
              href="/cabinet?tab=roles" label="Стать магазином →" />
          ) : (
          <div className="workshops-grid">
            {shopList.slice(0, 3).map((p) => {
              const d = p.role_details?.shop || {};
              const name = fmtDetailValue(d.shop_name) || p.display_name;
              return (
                <a key={p.id} href={`/people/${p.id}`} className="ws-card">
                  <div className="ws-cover" style={{ backgroundImage: `url('${p.photo}')` }}>
                    {fmtDetailValue(d.delivery_cis) && (
                      <div className="ws-pro" style={{ background: "rgba(124,249,255,.9)", color: "#001" }}>Доставка СНГ</div>
                    )}
                    <div className="ws-type">⌂ Магазин</div>
                  </div>
                  <div className="ws-body">
                    <div className="ws-name">{name}</div>
                    <div className="ws-loc">📍 {p.city || "—"}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {ROLE_DETAIL_FIELDS.shop.fields
                        .filter((f) => f.key !== "shop_name")
                        .map((f) => {
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

        {/* CTA */}
        <div className="cta-strip">
          <h2>Вступай первым.</h2>
          <p>
            Регистрация открыта. Первые 1000 участников получают
            Pro-статус бесплатно на 6 месяцев.
          </p>
          <a href="/auth/register" className="btn btn-primary btn-big">
            Создать аккаунт →
          </a>
        </div>
      </div>
    </>
  );
}
