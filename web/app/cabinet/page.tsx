import { PEOPLE } from "../../lib/mock";

const ME = PEOPLE[0]; // ZAKOS — заглушка до реальной авторизации

const NAV_ITEMS = [
  { id: "dashboard", icon: "▤", label: "Обзор" },
  { id: "profile",   icon: "◉", label: "Профиль" },
  { id: "roles",     icon: "★", label: "Роли и услуги" },
  { id: "subs",      icon: "♛", label: "Подписки и доход" },
  { id: "socials",   icon: "⌘", label: "Соцсети" },
  { id: "orders",    icon: "⚒", label: "Заказы",     num: 3 },
  { id: "responses", icon: "↗", label: "Отклики",    num: 5 },
  { id: "favs",      icon: "♥", label: "Избранное" },
  { id: "listings",  icon: "⌂", label: "Объявления", num: 2 },
  { id: "settings",  icon: "⚙", label: "Настройки" },
];

export default function CabinetPage() {
  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 60 }}>
      {/* Breadcrumbs */}
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">Кабинет</span>
      </div>

      <div className="acc-grid">
        {/* ── Sidebar ── */}
        <nav className="acc-nav">
          {/* Mini profile */}
          <div style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "12px 13px", marginBottom: 16,
            background: "var(--bg-2)", border: "1px solid var(--line)",
            borderRadius: 13,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              backgroundImage: `url('${ME.photo}')`,
              backgroundSize: "cover", backgroundPosition: "center",
              flexShrink: 0, border: "2px solid var(--accent)",
            }} />
            <div>
              <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 700, fontSize: 13 }}>
                {ME.display_name}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
                {ME.is_pro ? "PRO · " : ""}{ME.city}
              </div>
            </div>
          </div>

          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`/cabinet?tab=${item.id}`}
              className={`acc-nav-item${item.id === "dashboard" ? " on" : ""}`}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {item.num && <span className="num">{item.num}</span>}
            </a>
          ))}

          <div style={{ marginTop: 12, padding: "12px 13px", borderTop: "1px solid var(--line)" }}>
            <a href="/" style={{ fontSize: 12, color: "var(--ink-dim)" }}>← На сайт</a>
          </div>
        </nav>

        {/* ── Content ── */}
        <div>

          {/* ── Dashboard ── */}
          <div className="acc-card" style={{ background: "linear-gradient(135deg,rgba(255,45,111,.12),rgba(124,249,255,.06))", border: "1px solid rgba(255,45,111,.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 6 }}>
                  Добро пожаловать
                </div>
                <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 800, fontSize: 24, margin: "0 0 6px", letterSpacing: "-.02em" }}>
                  {ME.display_name} ✓
                </h2>
                <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
                  {ME.specialization} · {ME.city} · {ME.experience} опыта
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`/people/${ME.id}`} className="btn btn-ghost btn-sm">Мой профиль →</a>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 20 }}>
              {[
                { val: `${(ME.followers/1000).toFixed(1)}k`, label: "Подписчиков" },
                { val: ME.looks,       label: "Образов" },
                { val: "3",            label: "Заказов" },
                { val: "5",            label: "Откликов" },
              ].map((s) => (
                <div key={s.label} style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-.03em" }}>{s.val}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Available for work */}
          <div className="acc-card">
            <h3>Статус доступности</h3>
            <div className="toggle-row">
              <div>
                <strong>Open for work</strong>
                <small>На профиле появится зелёная плашка «Свободен»</small>
              </div>
              <div className="toggle on" />
            </div>
            <div className="toggle-row">
              <div>
                <strong>Принимаю личные сообщения</strong>
                <small>Все пользователи могут написать напрямую</small>
              </div>
              <div className="toggle on" />
            </div>
          </div>

          {/* Profile edit */}
          <div className="acc-card">
            <h3>Базовые данные</h3>
            <div className="field">
              <label>Ник</label>
              <input defaultValue={ME.display_name} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Город</label>
                <select defaultValue={ME.city}>
                  <option>Алматы</option>
                  <option>Астана</option>
                  <option>Бишкек</option>
                  <option>Ташкент</option>
                </select>
              </div>
              <div className="field">
                <label>Опыт</label>
                <input defaultValue={ME.experience} />
              </div>
            </div>
            <div className="field">
              <label>О себе</label>
              <textarea rows={3} placeholder="Расскажи про свой косплей..." />
            </div>
            <button className="btn btn-primary">Сохранить</button>
          </div>

          {/* Roles */}
          <div className="acc-card">
            <h3>Роли</h3>
            <div className="role-pick">
              {[
                { icon: "◉", name: "Косплеер",   desc: "Создаёшь образы",   on: true  },
                { icon: "◐", name: "Фотограф",   desc: "Снимаешь",          on: false },
                { icon: "◆", name: "Мастерская", desc: "Шьёшь, печатаешь", on: false },
                { icon: "⌂", name: "Магазин",    desc: "Продаёшь товары",   on: false },
                { icon: "⌖", name: "Локация",    desc: "Сдаёшь студию",     on: false },
                { icon: "♥", name: "Фанат",      desc: "Смотришь",          on: false },
              ].map((r) => (
                <div key={r.name} className={`role-pick-card${r.on ? " on" : ""}`}>
                  <div className="role-pick-ic">{r.icon}</div>
                  <div className="role-pick-name">{r.name}</div>
                  <div className="role-pick-d">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders — empty state */}
          <div className="acc-card">
            <h3>Заказы</h3>
            <EmptyBlock
              icon="⚒"
              title="Заказов пока нет"
              sub="Когда ты сделаешь заказ мастерской или получишь его — он появится здесь."
            />
          </div>

          {/* Favourites — empty state */}
          <div className="acc-card">
            <h3>Избранное</h3>
            <EmptyBlock
              icon="♥"
              title="Список пуст"
              sub="Сохраняй косплееров, мастерские и мудборды — они появятся здесь."
              cta={{ label: "Смотреть косплееров", href: "/people" }}
            />
          </div>

          {/* Socials */}
          <div className="acc-card">
            <h3>Социальные сети</h3>
            {[
              { name: "Instagram",  handle: "@zakos_cosplay", color: "#e1306c", connected: true  },
              { name: "TikTok",     handle: "Не подключён",   color: "#000",    connected: false },
              { name: "Telegram",   handle: "Не подключён",   color: "#229ed9", connected: false },
              { name: "VK",         handle: "Не подключён",   color: "#0077ff", connected: false },
            ].map((s) => (
              <div key={s.name} className="social-conn">
                <div className="social-conn-info">
                  <div className="social-conn-ic" style={{ background: s.color }}>
                    {s.name[0]}
                  </div>
                  <div>
                    <b>{s.name}</b>
                    <small>{s.handle}</small>
                  </div>
                </div>
                <button className={`social-status${s.connected ? " conn" : " off"}`}>
                  {s.connected ? "Подключён" : "Подключить"}
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

function EmptyBlock({ icon, title, sub, cta }: {
  icon: string;
  title: string;
  sub: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="empty-state">
      <div className="empty-glyph">{icon}</div>
      <p className="empty-title">{title}</p>
      <p className="empty-sub">{sub}</p>
      {cta && (
        <a href={cta.href} className="btn btn-ghost" style={{ marginTop: 8 }}>
          {cta.label} →
        </a>
      )}
    </div>
  );
}
