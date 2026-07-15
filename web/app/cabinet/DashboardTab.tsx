// Вкладка «Обзор» кабинета (дашборд по умолчанию). Вынесена из page.tsx (god-компонент) —
// последняя вкладка, после неё god-компонент полностью разобран по файлам.
type User = {
  display_name: string; photo: string | null; is_pro: boolean; mascot_image: string | null;
  city: string; specialization: string; experience: string; profile_id: number | null;
};
type LikeBreakdown = { label: string; val: number; count: number; icon: string };
type MyEvent = { id: number; title: string; city: string; place: string; date: string; day: number | string; month: string; going_total: number };

type Props = {
  user: User;
  goTab: (id: string) => void;
  followersCount: number; totalLikes: number; followingCount: number; ordersCount: number; newIncoming: number;
  likeBreakdown: LikeBreakdown[];
  availForWork: boolean; setAvailForWork: (v: boolean) => void;
  acceptMessages: boolean; setAcceptMessages: (v: boolean) => void;
  patchProfile: (patch: Record<string, unknown>) => void;
  myEvents: MyEvent[];
  openWorkshopForm: () => void;
};

export default function DashboardTab({
  user, goTab, followersCount, totalLikes, followingCount, ordersCount, newIncoming,
  likeBreakdown, availForWork, setAvailForWork, acceptMessages, setAcceptMessages, patchProfile,
  myEvents, openWorkshopForm,
}: Props) {
  return (
    <>
      <div className="acc-card" style={{ background: "linear-gradient(135deg,rgba(255,45,111,.12),rgba(124,249,255,.06))", border: "1px solid rgba(255,45,111,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 6 }}>
              Добро пожаловать
            </div>
            <h2 style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 24, margin: "0 0 6px", letterSpacing: "-.02em", display: "flex", alignItems: "center", gap: 10 }}>
              {user.display_name} ✓
              {user.mascot_image && (
                <img src={user.mascot_image} alt="Pro-маскот" title="Твой Pro-маскот"
                  style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", padding: 3, objectFit: "contain", boxShadow: "0 3px 12px rgba(0,0,0,.35)" }} />
              )}
            </h2>
            <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
              {user.specialization} · {user.city} · {user.experience} опыта
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {user.profile_id
              ? <a href={`/people/${user.profile_id}`} className="btn btn-ghost btn-sm">Мой профиль →</a>
              : <a href="/cabinet?tab=profile" className="btn btn-ghost btn-sm" onClick={(e) => { e.preventDefault(); goTab("profile"); }}>Заполнить профиль →</a>
            }
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginTop: 20 }}>
          {[
            { val: followersCount, label: "Подписчиков" },
            { val: totalLikes, label: "Лайков" },
            { val: followingCount, label: "Подписок" },
            { val: ordersCount, label: "Заказов" },
            { val: newIncoming, label: "Откликов" },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-.03em" }}>{s.val}</div>
              <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="acc-card">
        <h3>Лайки по разделам</h3>
        <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "0 0 14px" }}>
          Сколько лайков набрал твой контент — всего <b style={{ color: "var(--ink)" }}>{totalLikes}</b> ♥
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {likeBreakdown.map((b) => (
            <div key={b.label} style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22, color: "var(--accent-2)" }}>{b.icon}</span>
              <div>
                <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-.03em" }}>♥ {b.val}</div>
                <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 3 }}>
                  {b.label} · {b.count} шт
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="acc-card">
        <h3>Статус доступности</h3>
        <div className="toggle-row">
          <div>
            <strong>Open for work</strong>
            <small>На профиле появится зелёная плашка «Открыт к сотрудничеству»</small>
          </div>
          <div className={`toggle${availForWork ? " on" : ""}`}
            onClick={() => { const n = !availForWork; setAvailForWork(n); patchProfile({ available_for_work: n }); }}
            style={{ cursor: "pointer" }} />
        </div>
        <div className="toggle-row">
          <div>
            <strong>Принимаю личные сообщения</strong>
            <small>Все пользователи могут написать напрямую</small>
          </div>
          <div className={`toggle${acceptMessages ? " on" : ""}`}
            onClick={() => { const n = !acceptMessages; setAcceptMessages(n); patchProfile({ accept_messages: n }); }}
            style={{ cursor: "pointer" }} />
        </div>
      </div>

      {myEvents.length > 0 && (
        <div className="acc-card">
          <h3>Скоро у вас</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myEvents.map((e) => (
              <a key={e.id} href={`/events/${e.id}`} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12,
                color: "var(--ink)",
              }}>
                <div style={{ textAlign: "center", minWidth: 44 }}>
                  <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{e.day}</div>
                  <div style={{ fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase" }}>{e.month}</div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{e.place ? `${e.place} · ` : ""}{e.city}</div>
                </div>
                <span style={{ fontSize: 12, color: "var(--ink-dim)", whiteSpace: "nowrap" }}>{e.going_total} идут</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="acc-card">
        <h3>Быстрый доступ</h3>
        <button onClick={openWorkshopForm}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", width: "100%",
            background: "linear-gradient(135deg,rgba(255,45,111,.16),rgba(124,249,255,.08))",
            border: "1px solid rgba(255,45,111,.3)", borderRadius: 11, marginBottom: 10,
            cursor: "pointer", fontSize: 14, fontWeight: 700, color: "var(--ink)", textAlign: "left" }}>
          <span style={{ fontSize: 18 }}>◆</span>
          + Создать мастерскую
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { id: "profile",   icon: "◉", label: "Редактировать профиль" },
            { id: "roles",     icon: "★", label: "Роли и услуги" },
            { id: "responses", icon: "↗", label: `Отклики${newIncoming > 0 ? ` (${newIncoming})` : ""}` },
            { id: "listings",  icon: "⌂", label: "Объявления" },
          ].map((item) => (
            <button key={item.id} onClick={() => goTab(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 11,
                cursor: "pointer", fontSize: 13, color: "var(--ink)", textAlign: "left" }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
