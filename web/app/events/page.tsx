import { EVENTS } from "../../lib/mock";

export default function EventsPage() {
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="crumbs" style={{ paddingTop: 16 }}>
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">События</span>
      </div>

      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">сходки · конвенты · фотосеты</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,64px)" }}>
          События <span className="accent">СНГ.</span>
        </h1>
        <p className="hero-sub">
          Ближайшие косплей-сходки, фестивали и съёмки. Отмечай участие и находи команду.
        </p>
      </section>

      <div className="ev-list" style={{ marginTop: 24 }}>
        {EVENTS.map((e) => (
          <div key={e.id} className="ev">
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
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 28, color: "var(--ink-dim)", fontSize: 13 }}>
        Создание своих событий и запись появятся в ближайших обновлениях беты.
      </div>
    </div>
  );
}
