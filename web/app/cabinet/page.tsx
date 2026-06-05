"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PEOPLE } from "../../lib/mock";

const MOCK_ME = PEOPLE[0];

const ROLE_MAP: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Бишкек", "Ташкент", "Москва", "Другой"];

const ALL_ROLES = [
  { slug: "cosplayer",    icon: "◉", name: "Косплеер",   desc: "Создаёшь образы"  },
  { slug: "photographer", icon: "◐", name: "Фотограф",   desc: "Снимаешь"          },
  { slug: "workshop",     icon: "◆", name: "Мастерская", desc: "Шьёшь, печатаешь" },
  { slug: "shop",         icon: "⌂", name: "Магазин",    desc: "Продаёшь товары"  },
  { slug: "location",     icon: "⌖", name: "Локация",    desc: "Сдаёшь студию"    },
  { slug: "fan",          icon: "♥", name: "Фанат",      desc: "Смотришь"          },
];

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [me, setMe] = useState<any>(null);
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({ username: "", city: "", experience: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);
  const [availForWork, setAvailForWork] = useState(false);
  const [acceptMessages, setAcceptMessages] = useState(true);
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    setTab(new URLSearchParams(window.location.search).get("tab") || "dashboard");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/auth/me/`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) { router.replace("/auth/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setMe(data);
        setForm({ username: data.username || "", city: data.city || "", experience: data.experience || "", bio: data.bio || "" });
        setRoles(data.roles || []);
        setAvailForWork(!!data.available_for_work);
        setAcceptMessages(data.accept_messages !== false);
        setAuthed(true);
      })
      .catch(() => router.replace("/auth/login"));

    fetch(`/api/v1/orders/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const list = data.results ?? data;
        setOrdersCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [router]);

  function goTab(id: string) {
    setTab(id);
    window.history.pushState({}, "", `/cabinet?tab=${id}`);
  }

  async function saveBasics() {
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      const res = await fetch(`/api/v1/auth/me/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.username?.[0] || data.detail || "Не удалось сохранить");
      setMe(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(slug: string) {
    const next = roles.includes(slug) ? roles.filter((r) => r !== slug) : [...roles, slug];
    setRoles(next);
    setRolesLoading(true); setRolesSaved(false);
    try {
      await fetch(`/api/v1/auth/me/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ roles: next }),
      });
      setRolesSaved(true);
      setTimeout(() => setRolesSaved(false), 2000);
    } finally {
      setRolesLoading(false);
    }
  }

  async function patchProfile(patch: Record<string, unknown>) {
    await fetch(`/api/v1/auth/me/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(patch),
    });
  }

  if (!authed) return (
    <div className="wrap" style={{ paddingTop: 60, textAlign: "center", color: "var(--ink-dim)" }}>
      Загрузка...
    </div>
  );

  const user = {
    display_name: me.username || me.email?.split("@")[0] || me.phone || "Пользователь",
    photo: me.avatar || MOCK_ME.photo,
    is_pro: me.is_pro ?? false,
    city: me.city || "—",
    specialization: roles.length > 0 ? roles.map((r) => ROLE_MAP[r] || r).join(" · ") : "Фанат",
    experience: me.experience || "—",
    id: me.id,
  };

  const NAV_ITEMS = [
    { id: "dashboard", icon: "▤", label: "Обзор" },
    { id: "profile",   icon: "◉", label: "Профиль" },
    { id: "roles",     icon: "★", label: "Роли и услуги" },
    { id: "subs",      icon: "♛", label: "Подписки и доход" },
    { id: "socials",   icon: "⌘", label: "Соцсети" },
    { id: "orders",    icon: "⚒", label: "Заказы",  num: ordersCount || undefined },
    { id: "responses", icon: "↗", label: "Отклики" },
    { id: "favs",      icon: "♥", label: "Избранное" },
    { id: "listings",  icon: "⌂", label: "Объявления" },
    { id: "settings",  icon: "⚙", label: "Настройки" },
  ];

  function renderContent() {
    switch (tab) {
      case "profile":
        return (
          <div className="acc-card">
            <h3>Базовые данные</h3>
            <div className="field">
              <label>Ник</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Город</label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  <option value="">Не выбран</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Опыт</label>
                <input value={form.experience} placeholder="напр. 3 года"
                  onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>О себе</label>
              <textarea rows={3} placeholder="Расскажи про свой косплей..."
                value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            {saveErr && (
              <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 10, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
                {saveErr}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn btn-primary" onClick={saveBasics} disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
              {saved && <span style={{ color: "var(--green)", fontSize: 13 }}>✓ Сохранено</span>}
            </div>
          </div>
        );

      case "roles":
        return (
          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Роли</h3>
              <span style={{ fontSize: 12, color: rolesLoading ? "var(--ink-dim)" : "var(--green)", opacity: rolesLoading || rolesSaved ? 1 : 0, transition: "opacity .3s" }}>
                {rolesLoading ? "Сохраняем..." : "✓ Сохранено"}
              </span>
            </div>
            <div className="role-pick">
              {ALL_ROLES.map((r) => (
                <div key={r.slug}
                  className={`role-pick-card${roles.includes(r.slug) ? " on" : ""}`}
                  onClick={() => toggleRole(r.slug)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="role-pick-ic">{r.icon}</div>
                  <div className="role-pick-name">{r.name}</div>
                  <div className="role-pick-d">{r.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "12px 0 0" }}>
              Роли влияют на статистику сайта и видимость в каталогах
            </p>
          </div>
        );

      case "orders":
        return (
          <div className="acc-card">
            <h3>Заказы{ordersCount > 0 ? ` (${ordersCount})` : ""}</h3>
            <EmptyBlock icon="⚒" title="Заказов пока нет"
              sub="Когда ты сделаешь заказ мастерской или получишь его — он появится здесь." />
          </div>
        );

      case "favs":
        return (
          <div className="acc-card">
            <h3>Избранное</h3>
            <EmptyBlock icon="♥" title="Список пуст"
              sub="Сохраняй косплееров, мастерские и мудборды — они появятся здесь."
              cta={{ label: "Смотреть косплееров", href: "/people" }} />
          </div>
        );

      case "subs":
      case "socials":
      case "responses":
      case "listings":
      case "settings":
        return (
          <div className="acc-card">
            <EmptyBlock icon="◆" title="Скоро"
              sub="Этот раздел в разработке. Появится в следующем обновлении." />
          </div>
        );

      default: // dashboard
        return (
          <>
            <div className="acc-card" style={{ background: "linear-gradient(135deg,rgba(255,45,111,.12),rgba(124,249,255,.06))", border: "1px solid rgba(255,45,111,.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 6 }}>
                    Добро пожаловать
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 24, margin: "0 0 6px", letterSpacing: "-.02em" }}>
                    {user.display_name} ✓
                  </h2>
                  <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
                    {user.specialization} · {user.city} · {user.experience} опыта
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`/people/${user.id}`} className="btn btn-ghost btn-sm">Мой профиль →</a>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginTop: 20 }}>
                {[
                  { val: "0", label: "Подписчиков" },
                  { val: "0", label: "Образов" },
                  { val: ordersCount, label: "Заказов" },
                  { val: "0", label: "Откликов" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-.03em" }}>{s.val}</div>
                    <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="acc-card">
              <h3>Статус доступности</h3>
              <div className="toggle-row">
                <div>
                  <strong>Open for work</strong>
                  <small>На профиле появится зелёная плашка «Свободен»</small>
                </div>
                <div
                  className={`toggle${availForWork ? " on" : ""}`}
                  onClick={() => {
                    const next = !availForWork;
                    setAvailForWork(next);
                    patchProfile({ available_for_work: next });
                  }}
                  style={{ cursor: "pointer" }}
                />
              </div>
              <div className="toggle-row">
                <div>
                  <strong>Принимаю личные сообщения</strong>
                  <small>Все пользователи могут написать напрямую</small>
                </div>
                <div
                  className={`toggle${acceptMessages ? " on" : ""}`}
                  onClick={() => {
                    const next = !acceptMessages;
                    setAcceptMessages(next);
                    patchProfile({ accept_messages: next });
                  }}
                  style={{ cursor: "pointer" }}
                />
              </div>
            </div>

            <div className="acc-card">
              <h3>Быстрый доступ</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { id: "profile", icon: "◉", label: "Редактировать профиль" },
                  { id: "roles",   icon: "★", label: "Мои роли" },
                  { id: "orders",  icon: "⚒", label: "Заказы" },
                  { id: "favs",    icon: "♥", label: "Избранное" },
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
  }

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">Кабинет</span>
      </div>

      <div className="acc-grid">
        {/* Sidebar */}
        <nav className="acc-nav">
          <div style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "12px 13px", marginBottom: 16,
            background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 13,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              backgroundImage: `url('${user.photo}')`,
              backgroundSize: "cover", backgroundPosition: "center",
              flexShrink: 0, border: "2px solid var(--accent)",
            }} />
            <div>
              <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 700, fontSize: 13 }}>
                {user.display_name}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--font-mono),monospace" }}>
                {user.is_pro ? "PRO · " : ""}{user.city}
              </div>
            </div>
          </div>

          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`/cabinet?tab=${item.id}`}
              onClick={(e) => { e.preventDefault(); goTab(item.id); }}
              className={`acc-nav-item${tab === item.id ? " on" : ""}`}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {item.num != null && item.num > 0 && <span className="num">{item.num}</span>}
            </a>
          ))}

          <div style={{ marginTop: 12, padding: "12px 13px", borderTop: "1px solid var(--line)", display: "flex", gap: 12 }}>
            <a href="/" style={{ fontSize: 12, color: "var(--ink-dim)" }}>← На сайт</a>
            <button
              onClick={() => {
                fetch(`/api/v1/auth/logout/`, { method: "POST", credentials: "include" })
                  .finally(() => router.push("/"));
              }}
              style={{ fontSize: 12, color: "var(--ink-dim)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Выйти
            </button>
          </div>
        </nav>

        {/* Content */}
        <div>{renderContent()}</div>
      </div>
    </div>
  );
}

function EmptyBlock({ icon, title, sub, cta }: {
  icon: string; title: string; sub: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="empty-state">
      <div className="empty-glyph">{icon}</div>
      <p className="empty-title">{title}</p>
      <p className="empty-sub">{sub}</p>
      {cta && <a href={cta.href} className="btn btn-ghost" style={{ marginTop: 8 }}>{cta.label} →</a>}
    </div>
  );
}
