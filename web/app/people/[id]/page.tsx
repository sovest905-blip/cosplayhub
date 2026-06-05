import { PEOPLE } from "../../../lib/mock";
import { notFound } from "next/navigation";
import GatedButton from "../../components/GatedButton";
import { getProfile, type Person } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const apiPerson = await getProfile(id);
  const mockPerson = PEOPLE.find((p) => p.id === Number(id));
  const person = (apiPerson || (mockPerson as unknown as Person)) as Person & { bio?: string };
  if (!person) notFound();

  // Профиль существует, но ещё не заполнен
  const isEmpty = !!apiPerson && !person.bio && person.experience === "—" && !person.available_for_work;

  return (
    <div className="wrap">
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <a href="/people">Косплееры</a>
        <span className="sep">›</span>
        <span className="cur">{person.display_name}</span>
      </div>

      {isEmpty && (
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
      )}

      <div className="profile-hero">
        <img src={person.photo} alt={person.display_name} />
        {person.available_for_work && (
          <div className="avail-pill">Доступен для работы</div>
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
            <span className="role-badge">Косплеер</span>
            {person.is_pro && (
              <span className="role-badge" style={{ background: "rgba(255,210,74,.08)", color: "var(--accent-3)", borderColor: "rgba(255,210,74,.2)" }}>PRO</span>
            )}
          </div>
        </div>
        <div className="profile-actions">
          <GatedButton className="btn btn-primary">Написать</GatedButton>
          <GatedButton className="btn btn-ghost">Подписаться</GatedButton>
        </div>
      </div>

      <div className="profile-mini-stats">
        <div className="pmsi"><b>{person.followers > 0 ? (person.followers / 1000).toFixed(1) + "k" : "0"}</b><span>Подписчиков</span></div>
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
          <div className="about">
            <h3>Образы</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} style={{
                  aspectRatio: "1", borderRadius: 10,
                  backgroundImage: `url('${person.photo}')`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  opacity: 0.6 + i * 0.04,
                }} />
              ))}
            </div>
          </div>
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
                {person.available_for_work ? "Свободен" : "Не указан"}
              </span>
            </div>
            <div className="info-row">
              <span>Уровень</span>
              <span style={{ color: person.is_pro ? "var(--accent-3)" : "var(--ink)" }}>
                {person.is_pro ? "PRO" : "Базовый"}
              </span>
            </div>
          </div>

          {isEmpty ? (
            <div className="about" style={{
              background: "linear-gradient(135deg,rgba(157,124,255,.1),rgba(255,45,111,.06))",
              border: "1px solid rgba(157,124,255,.25)",
            }}>
              <h3 style={{ color: "var(--accent-4)" }}>Это ваш профиль?</h3>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>
                Войдите в кабинет и заполните профиль — добавьте фото, роли и описание.
              </p>
              <a href="/cabinet?tab=profile" className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
                Заполнить профиль →
              </a>
            </div>
          ) : (
            <div className="about" style={{
              background: "linear-gradient(135deg,rgba(157,124,255,.15),rgba(255,45,111,.08))",
              border: "1px solid rgba(157,124,255,.3)",
            }}>
              <h3 style={{ color: "var(--accent-4)" }}>Поддержать</h3>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>
                Подпишитесь, чтобы получить эксклюзивные образы и ранний доступ.
              </p>
              <GatedButton className="btn btn-primary" fullWidth>
                Подписаться · от 500₸
              </GatedButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
