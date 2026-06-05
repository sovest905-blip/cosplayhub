"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PEOPLE } from "../../lib/mock";

const MOCK_ME = PEOPLE[0];

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

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Бишкек", "Ташкент", "Москва", "Другой"];

export default function CabinetPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({ username: "", city: "", experience: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);

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
        setForm({
          username: data.username || "",
          city: data.city || "",
          experience: data.experience || "",
          bio: data.bio || "",
        });
        setRoles(data.roles || []);
        setAuthed(true);
      })
      .catch(() => router.replace("/auth/login"));
    return () => { cancelled = true; };
  }, [router]);

  async function saveBasics() {
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      const res = await fetch(`/api/v1/auth/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.username?.[0] || data.detail || "Не удалось сохранить");
      }
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
    setRolesLoading(true);
    setRolesSaved(false);
    try {
      await fetch(`/api/v1/auth/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roles: next }),
      });
      setRolesSaved(true);
      setTimeout(() => setRolesSaved(false), 2000);
    } finally {
      setRolesLoading(false);
    }
  }

  // Пока не подтвердили авторизацию — не показываем кабинет (иначе мелькает мок)
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
    specialization: me.roles?.[0] || "Косплеер",
    experience: me.experience || "—",
    followers: me.followers ?? 0,
    looks: me.looks ?? 0,
    id: me.id,
  };

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
            background: "var(--bg-2)", border: "1px solid var(--line)",
            borderRadius: 13,
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
              className={`acc-nav-item${item.id === "dashboard" ? " on" : ""}`}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {item.num && <span className="num">{item.num}</span>}
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
        <div>
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
                { val: user.followers > 0 ? `${(user.followers / 1000).toFixed(1)}k` : "0", label: "Подписчиков" },
                { val: user.looks, label: "Образов" },
                { val: "0", label: "Заказов" },
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

          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Роли</h3>
              <span style={{ fontSize: 12, color: rolesLoading ? "var(--ink-dim)" : "var(--green)", opacity: rolesLoading || rolesSaved ? 1 : 0, transition: "opacity .3s" }}>
                {rolesLoading ? "Сохраняем..." : "✓ Сохранено"}
              </span>
            </div>
            <div className="role-pick">
              {[
                { slug: "cosplayer",    icon: "◉", name: "Косплеер",   desc: "Создаёшь образы"   },
                { slug: "photographer", icon: "◐", name: "Фотограф",   desc: "Снимаешь"           },
                { slug: "workshop",     icon: "◆", name: "Мастерская", desc: "Шьёшь, печатаешь"  },
                { slug: "shop",         icon: "⌂", name: "Магазин",    desc: "Продаёшь товары"   },
                { slug: "location",     icon: "⌖", name: "Локация",    desc: "Сдаёшь студию"     },
                { slug: "fan",          icon: "♥", name: "Фанат",      desc: "Смотришь"           },
              ].map((r) => (
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

          <div className="acc-card">
            <h3>Заказы</h3>
            <EmptyBlock icon="⚒" title="Заказов пока нет"
              sub="Когда ты сделаешь заказ мастерской или получишь его — он появится здесь." />
          </div>

          <div className="acc-card">
            <h3>Избранное</h3>
            <EmptyBlock icon="♥" title="Список пуст"
              sub="Сохраняй косплееров, мастерские и мудборды — они появятся здесь."
              cta={{ label: "Смотреть косплееров", href: "/people" }} />
          </div>
        </div>
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
