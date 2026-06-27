import { PEOPLE } from "../../../lib/mock";
import { notFound } from "next/navigation";
import MessageButton from "../../components/MessageButton";
import OwnerOnly from "../../components/OwnerOnly";
import SlotList from "../../components/SlotList";
import FollowButton from "../../components/FollowButton";
import SaveButton from "../../components/SaveButton";
import ProfileViewTracker from "../../components/ProfileViewTracker";
import DonateButton from "../../components/DonateButton";
import { getProfile, getLooksByAuthor, getProductsByOwner, type Person, type LookItem, type Product, ROLE_DETAIL_FIELDS, fmtDetailValue, fmtPrice, PRODUCT_STATUS_META, SOCIAL_META, socialUrl } from "../../../lib/api";

const ROLE_RU: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const apiPerson = await getProfile(id);
  const mockPerson = PEOPLE.find((p) => p.id === Number(id));
  const person = (apiPerson || (mockPerson as unknown as Person)) as Person & { bio?: string };
  if (!person) notFound();

  // Реальные образы автора (модель Look) — для блока «Образы».
  const looks: LookItem[] = person.user_id ? await getLooksByAuthor(person.user_id).catch(() => []) : [];

  // Витрина товаров — для роли «магазин». Слоты аренды — для роли «локация».
  const isShop = (person.roles || []).includes("shop");
  const isLocation = (person.roles || []).includes("location");
  const products: Product[] = (isShop && person.user_id)
    ? await getProductsByOwner(person.user_id).catch(() => [])
    : [];

  // Профиль существует, но ещё не заполнен
  const isEmpty = !!apiPerson && !person.bio && person.experience === "—" && !person.available_for_work;

  return (
    <div className="wrap">
      <ProfileViewTracker id={id} />
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <a href="/people">Косплееры</a>
        <span className="sep">›</span>
        <span className="cur">{person.display_name}</span>
      </div>

      {isEmpty && (
        <OwnerOnly ownerId={person.user_id ?? null}>
        <div style={{
          margin: "0 0 24px",
          padding: "20px 24px",
          background: "linear-gradient(135deg,rgba(157,124,255,.12),rgba(255,45,111,.06))",
          border: "1px solid rgba(157,124,255,.3)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              Профиль ещё не заполнен
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
              Добавьте фото, роли, город и расскажите о себе — вас смогут найти в каталоге.
            </div>
          </div>
          <a href="/cabinet?tab=profile" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
            Заполнить профиль →
          </a>
        </div>
        </OwnerOnly>
      )}

      <div className="profile-hero" style={{
        backgroundImage: person.photo ? `url('${person.photo}')` : undefined,
        backgroundSize: "cover", backgroundPosition: "center top",
      }}>
        {person.available_for_work && (
          <div className="avail-pill">Открыт к сотрудничеству</div>
        )}
      </div>

      <div className="profile-head">
        <div className="avatar" style={{ backgroundImage: `url('${person.photo}')` }} />
        <div className="profile-meta">
          <h1>
            {person.display_name}
            {person.is_verified && <span className="verified">✓</span>}
          </h1>
          <div className="role">{person.specialization} · {person.city}</div>
          <div className="roles-line">
            {(person.roles?.length ? person.roles : ["cosplayer"]).map((r) => (
              <span key={r} className="role-badge">{ROLE_RU[r] || r}</span>
            ))}
            {person.is_pro && (
              <span className="role-badge" style={{ background: "rgba(255,210,74,.08)", color: "var(--accent-3)", borderColor: "rgba(255,210,74,.2)" }}>PRO</span>
            )}
          </div>
        </div>
        <div className="profile-actions">
          <MessageButton userId={(person as Person).user_id ?? null} className="btn btn-primary" />
          <FollowButton userId={(person as Person).user_id ?? null} className="btn btn-ghost" />
          <SaveButton kind="profile" objectId={apiPerson ? person.id : null} className="btn btn-ghost" />
        </div>
      </div>

      <div className="profile-mini-stats">
        <div className="pmsi"><b>{person.followers >= 1000 ? (person.followers / 1000).toFixed(1) + "k" : person.followers}</b><span>Подписчиков</span></div>
        <div className="pmsi"><b>{person.looks || 0}</b><span>Образов</span></div>
        <div className="pmsi"><b>{person.experience}</b><span>Опыт</span></div>
        <div className="pmsi"><b>{person.city}</b><span>Город</span></div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="about">
            <h3>Об авторе</h3>
            {person.bio ? (
              <p>{person.bio}</p>
            ) : (
              <p style={{ color: "var(--ink-dim)", fontStyle: "italic" }}>
                {isEmpty ? "Описание не добавлено." : `Косплеер из ${person.city}. Специализация: ${person.specialization}. Опыт ${person.experience}.`}
              </p>
            )}
          </div>
          {isShop && (
            <div className="about">
              <h3>Товары{products.length > 0 && <span style={{ color: "var(--ink-dim)", fontWeight: 400, fontSize: 13 }}> · {products.length}</span>}</h3>
              {products.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
                  {products.map((pr) => {
                    const st = PRODUCT_STATUS_META[pr.status] || { label: pr.status_display, color: "var(--ink-dim)" };
                    return (
                      <a key={pr.id} href={`/products/${pr.id}`} style={{
                        display: "block", borderRadius: 14, overflow: "hidden",
                        border: "1px solid var(--line)", background: "var(--bg-2)",
                      }}>
                        <div style={{
                          aspectRatio: "1", backgroundSize: "cover", backgroundPosition: "center",
                          backgroundImage: `url('${pr.image || pr.image_url || "https://images.unsplash.com/photo-1513094735237-8f2714d57c13?w=400&q=80"}')`,
                        }} />
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{pr.title}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtPrice(pr.price)}</span>
                            <span style={{ fontSize: 10, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <OwnerOnly
                  ownerId={person.user_id ?? null}
                  fallback={<p style={{ color: "var(--ink-dim)", fontSize: 14, margin: 0 }}>Товаров пока нет.</p>}
                >
                  <p style={{ color: "var(--ink-dim)", fontSize: 14, margin: 0 }}>
                    Товаров пока нет. Добавьте их в{" "}
                    <a href="/cabinet?tab=roles" style={{ color: "var(--accent-2)" }}>кабинете</a>.
                  </p>
                </OwnerOnly>
              )}
            </div>
          )}

          {isLocation && (
            <div className="about">
              <h3>Слоты аренды</h3>
              <SlotList ownerId={(person as Person).user_id ?? null} />
            </div>
          )}

          {(person.roles || []).filter((r) => {
            const d = person.role_details?.[r];
            return ROLE_DETAIL_FIELDS[r] && d && Object.values(d).some((v) => fmtDetailValue(v) !== "");
          }).map((r) => {
            const cfg = ROLE_DETAIL_FIELDS[r];
            const d = person.role_details[r];
            return (
              <div className="about" key={r}>
                <h3><span style={{ color: "var(--accent-2)", marginRight: 6 }}>{cfg.icon}</span>{cfg.title}</h3>
                {cfg.fields.map((f) => {
                  const val = fmtDetailValue(d[f.key], f.suffix);
                  if (!val) return null;
                  const isUrl = typeof d[f.key] === "string" && /^https?:\/\//.test(d[f.key]);
                  return (
                    <div className="info-row" key={f.key}>
                      <span>{f.label}</span>
                      {isUrl
                        ? <a href={d[f.key]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-2)" }}>Открыть ↗</a>
                        : <span style={{ textAlign: "right" }}>{val}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {person.photos?.length > 0 && (
            <div className="about">
              <h3>Фотогалерея</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {person.photos.map((ph) => (
                  <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" style={{
                    aspectRatio: "1", borderRadius: 10, display: "block",
                    backgroundImage: `url('${ph.url}')`, backgroundSize: "cover", backgroundPosition: "center",
                  }} />
                ))}
              </div>
            </div>
          )}

          {person.pinned_looks && person.pinned_looks.length > 0 && (
            <div className="about">
              <h3>📌 Избранные образы</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {person.pinned_looks.map((l) => (
                  <a key={l.id} href={`/looks/${l.id}`} title={l.title} style={{
                    aspectRatio: "3/4", borderRadius: 10, display: "block",
                    backgroundImage: `url('${l.image || person.photo}')`, backgroundSize: "cover", backgroundPosition: "center",
                  }} />
                ))}
              </div>
            </div>
          )}

          {looks.length > 0 ? (
            <div className="about">
              <h3>Образы <span style={{ color: "var(--ink-dim)", fontWeight: 400, fontSize: 13 }}>· {looks.length}</span></h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {looks.map((l) => (
                  <a key={l.id} href="/looks" title={l.title} style={{
                    aspectRatio: "1", borderRadius: 10, display: "block", position: "relative",
                    backgroundImage: `url('${l.image || person.photo}')`, backgroundSize: "cover", backgroundPosition: "center",
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="about">
              <h3>Образы</h3>
              <p style={{ color: "var(--ink-dim)", fontSize: 14, margin: 0 }}>Пока нет образов.</p>
            </div>
          )}
        </div>

        <div>
          <div className="about">
            <h3>Информация</h3>
            <div className="info-row"><span>Город</span><span>{person.city}</span></div>
            <div className="info-row"><span>Опыт</span><span>{person.experience}</span></div>
            <div className="info-row"><span>Специализация</span><span>{person.specialization}</span></div>
            <div className="info-row">
              <span>Статус</span>
              <span style={{ color: person.available_for_work ? "var(--green)" : "var(--ink-dim)" }}>
                {person.available_for_work ? "Открыт к сотрудничеству" : "Не ищет проекты"}
              </span>
            </div>
            <div className="info-row">
              <span>Уровень</span>
              <span style={{ color: person.is_pro ? "var(--accent-3)" : "var(--ink)" }}>
                {person.is_pro ? "PRO" : "Базовый"}
              </span>
            </div>
          </div>

          {person.socials?.length > 0 && (
            <div className="about">
              <h3>Соцсети</h3>
              {person.socials.map((s) => {
                const meta = SOCIAL_META[s.platform];
                return (
                  <div className="info-row" key={s.platform + s.handle}>
                    <span>{meta ? `${meta.icon} ${meta.label}` : s.platform}</span>
                    <a href={socialUrl(s.platform, s.handle)} target="_blank" rel="noopener noreferrer"
                       style={{ color: "var(--accent-2)" }}>Открыть ↗</a>
                  </div>
                );
              })}
            </div>
          )}

          {isEmpty ? (
            <OwnerOnly ownerId={person.user_id ?? null}>
              <div className="about" style={{
                background: "linear-gradient(135deg,rgba(157,124,255,.1),rgba(255,45,111,.06))",
                border: "1px solid rgba(157,124,255,.25)",
              }}>
                <h3 style={{ color: "var(--accent-4)" }}>Это ваш профиль?</h3>
                <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>
                  Заполните профиль — добавьте фото, роли и описание.
                </p>
                <a href="/cabinet?tab=profile" className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
                  Заполнить профиль →
                </a>
              </div>
            </OwnerOnly>
          ) : (person.donations && person.donations.length > 0) ? (
            <div className="about" style={{
              background: "linear-gradient(135deg,rgba(157,124,255,.15),rgba(255,45,111,.08))",
              border: "1px solid rgba(157,124,255,.3)",
            }}>
              <h3 style={{ color: "var(--accent-4)" }}>Поддержать</h3>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>
                Нравится творчество? Поддержите криптой — напрямую, без комиссии платформы.
              </p>
              <DonateButton methods={person.donations} name={person.display_name} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
