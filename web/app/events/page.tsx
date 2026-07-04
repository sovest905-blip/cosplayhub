import { getEvents } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const api = await getEvents().catch(() => null);
  const list: any[] = api || [];

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

      {list.length === 0 ? (
        <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18, marginTop: 24 }}>
          <div className="empty-glyph">◈</div>
          <p className="empty-title">Событий пока нет</p>
          <p className="empty-sub">Ближайшие сходки, фестивали и съёмки появятся здесь. Загляни позже.</p>
        </div>
      ) : (
        <>
          <div className="ev-list" style={{ marginTop: 24 }}>
            {list.map((e) => (
              <a key={e.id} href={`/events/${e.id}`} className="ev" style={{ color: "inherit", cursor: "pointer" }}>
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

          <div style={{ textAlign: "center", marginTop: 28, color: "var(--ink-dim)", fontSize: 13 }}>
            Открой событие, чтобы посмотреть детали и отметиться «Пойду».
          </div>
        </>
      )}
    </div>
  );
}
