import { PEOPLE } from "../../../lib/mock";
import { notFound } from "next/navigation";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = PEOPLE.find((p) => p.id === Number(id));
  if (!person) notFound();

  return (
    <div className="wrap">
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <a href="/people">Косплееры</a>
        <span className="sep">›</span>
        <span className="cur">{person.display_name}</span>
      </div>

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
          <button className="btn btn-primary">Написать</button>
          <button className="btn btn-ghost">Подписаться</button>
        </div>
      </div>

      <div className="profile-mini-stats">
        <div className="pmsi"><b>{(person.followers / 1000).toFixed(1)}k</b><span>Подписчиков</span></div>
        <div className="pmsi"><b>{person.looks}</b><span>Образов</span></div>
        <div className="pmsi"><b>{person.experience}</b><span>Опыт</span></div>
        <div className="pmsi"><b>{person.city}</b><span>Город</span></div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="about">
            <h3>Об авторе</h3>
            <p>
              Косплеер из {person.city}. Специализация: {person.specialization}.
              Опыт {person.experience}. Открыт для коллабораций и коммерческих проектов.
            </p>
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
                {person.available_for_work ? "Свободен" : "Занят"}
              </span>
            </div>
            <div className="info-row">
              <span>Уровень</span>
              <span style={{ color: person.is_pro ? "var(--accent-3)" : "var(--ink)" }}>
                {person.is_pro ? "PRO" : "Базовый"}
              </span>
            </div>
          </div>

          <div className="about" style={{
            background: "linear-gradient(135deg,rgba(157,124,255,.15),rgba(255,45,111,.08))",
            border: "1px solid rgba(157,124,255,.3)",
          }}>
            <h3 style={{ color: "var(--accent-4)" }}>Поддержать</h3>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>
              Подпишитесь, чтобы получить эксклюзивные образы и ранний доступ.
            </p>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Подписаться · от 500₸
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
