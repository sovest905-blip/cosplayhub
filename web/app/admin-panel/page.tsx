"use client";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ROLE_FORMS, RoleFields, galleryLimit } from "../../lib/roleForms";

const ROLE_LIST: { slug: string; name: string }[] = [
  { slug: "cosplayer", name: "Косплеер" }, { slug: "photographer", name: "Фотограф" },
  { slug: "workshop", name: "Мастерская" }, { slug: "shop", name: "Магазин" },
  { slug: "location", name: "Локация" }, { slug: "fan", name: "Фанат" },
];
const ROLE_RU: Record<string, string> = Object.fromEntries(ROLE_LIST.map((r) => [r.slug, r.name]));

type AdminUser = {
  id: number; username: string; email: string; phone: string; city: string;
  is_staff: boolean; is_active: boolean; is_verified: boolean; is_pro?: boolean; pro_active_until?: string | null;
  roles: string[]; role_details: Record<string, any>;
  profile_id: number | null; followers: number; following: number; avatar: string | null;
};
type NewsItem = { id: number; title: string; body: string; image: string | null; is_pinned: boolean; created_at: string };
type Sub = { target_id: number; username: string; avatar: string | null; since: string };

type TabId = "dashboard" | "curated" | "categories" | "news" | "guides" | "looks" | "teams" | "users" | "admins" | "invites" | "locations" | "workshops" | "shops" | "products" | "listings" | "orders" | "subscriptions";
const TABS: [TabId, string][] = [
  ["dashboard", "▤ Дашборд"],
  ["curated", "★ Выбор редакции"],
  ["categories", "✦ Категории"],
  ["news", "◆ Новости и события"],
  ["guides", "❖ Гайды"],
  ["looks", "✧ Образы"],
  ["teams", "♛ Команды"],
  ["users", "◇ Пользователи"],
  ["admins", "⚙ Админы"],
  ["invites", "✉ Инвайты"],
  ["locations", "⌖ Локации"],
  ["workshops", "⚒ Мастерские"],
  ["shops", "⌂ Магазины"],
  ["products", "▦ Товары"],
  ["listings", "⌂ Объявления"],
  ["orders", "↗ Заказы"],
  ["subscriptions", "♛ Подписки Pro"],
];

const PLAN_RU: Record<string, string> = { pro: "Pro профиля", workshop: "Тариф мастерской" };
const SUB_STATUS_RU: Record<string, string> = { active: "Активна", expired: "Истекла", disabled: "Отключена" };
const SUB_STATUS_COLOR: Record<string, string> = { active: "var(--green)", expired: "var(--ink-dim)", disabled: "var(--red)" };

const WS_TYPE_RU: Record<string, string> = { print3d: "3D-печать", eva: "EVA", sewing: "Швейная", wigs: "Парики" };
const LISTING_TYPE_RU: Record<string, string> = { job: "Ищу спеца", collab: "Коллаб", sell: "Продаю", buy: "Куплю" };
const ORDER_STATUS_RU: Record<string, string> = {
  request: "Заявка", accepted: "Принят", in_work: "В работе", shipped: "Отправлен", done: "Получен", cancelled: "Отменён",
};

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}

function fmtDate(s: string) { try { return new Date(s).toLocaleDateString("ru-RU"); } catch { return ""; } }

export default function AdminPanelPage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null); // null=loading, false=нет доступа
  const [tab, setTab] = useState<TabId>("dashboard");

  useEffect(() => {
    api("/auth/me/")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me) { router.replace("/auth/login?next=/admin-panel"); return; }
        setOk(!!me.is_staff);
      })
      .catch(() => setOk(false));
  }, [router]);

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;
  if (!ok) return (
    <div className="wrap" style={{ padding: 48 }}>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif" }}>Нет доступа</h1>
      <p style={{ color: "var(--ink-dim)" }}>Эта панель только для администраторов.</p>
      <a href="/cabinet" className="btn btn-ghost">← В кабинет</a>
    </div>
  );

  return (
    <div className="wrap" style={{ padding: "28px 28px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 26, margin: 0 }}>Админ-панель</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 22, alignItems: "start" }}>
        <div className="ap-side" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 8 }}>
          {TABS.map(([id, label]) => (
            <div key={id} onClick={() => setTab(id)}
              style={{
                padding: "11px 14px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 14,
                marginBottom: 4,
                color: tab === id ? "var(--ink)" : "var(--ink-dim)",
                background: tab === id ? "linear-gradient(135deg,rgba(255,45,111,.16),rgba(124,249,255,.06))" : "transparent",
                border: tab === id ? "1px solid rgba(255,45,111,.3)" : "1px solid transparent",
              }}>
              {label}
            </div>
          ))}
        </div>
        <div>
          {tab === "dashboard" && <Dashboard onGo={setTab} />}
          {tab === "curated" && <CuratedAdmin />}
          {tab === "categories" && <CategoriesAdmin />}
          {tab === "news" && <><NewsAdmin /><div style={{ height: 22 }} /><EventsAdmin /></>}
          {tab === "guides" && <GuidesAdmin />}
          {tab === "looks" && <LooksAdmin />}
          {tab === "teams" && <TeamsAdmin />}
          {tab === "users" && <UsersAdmin roleFilter="" />}
          {tab === "admins" && <AdminsAdmin />}
          {tab === "invites" && <InvitesAdmin />}
          {tab === "locations" && <UsersAdmin roleFilter="location" />}
          {tab === "workshops" && <WorkshopsAdmin />}
          {tab === "shops" && <UsersAdmin roleFilter="shop" />}
          {tab === "products" && <ProductsAdmin />}
          {tab === "listings" && <ListingsAdmin />}
          {tab === "orders" && <OrdersAdmin />}
          {tab === "subscriptions" && <SubscriptionsAdmin />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── НОВОСТИ ───────────────────────────
function NewsAdmin() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function load() {
    api("/news/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(d.results ?? d ?? []));
  }
  useEffect(load, []);

  function resetForm() {
    setEditId(null); setTitle(""); setBody(""); setPinned(false); setImage(null); setErr("");
  }
  function startEdit(n: NewsItem) {
    setEditId(n.id); setTitle(n.title); setBody(n.body || ""); setPinned(n.is_pinned);
    setImage(null); setErr(""); setShow(true);
  }

  async function publish() {
    if (!title.trim()) { setErr("Введите заголовок"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("body", body);
      fd.append("is_pinned", pinned ? "true" : "false");
      if (image) fd.append("image", image);  // при редактировании без нового файла — старая картинка остаётся
      const res = editId
        ? await api(`/news/${editId}/`, { method: "PATCH", body: fd })
        : await api("/news/", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Не удалось"); }
      resetForm(); setShow(false);
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Удалить новость?")) return;
    const res = await api(`/news/${id}/`, { method: "DELETE" });
    if (res.ok) setItems((p) => p.filter((n) => n.id !== id));
  }

  return (
    <div className="acc-card" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: 0 }}>Новости</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { if (show) { resetForm(); setShow(false); } else { resetForm(); setShow(true); } }}>
          {show ? "Отмена" : "+ Добавить новость"}
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 16px" }}>Видны всем на странице /news.</p>

      {show && (
        <div style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editId ? "Редактировать новость" : "Новая новость"}</h3>
          <div className="field"><label>Заголовок</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Открыта закрытая бета!" /></div>
          <div className="field"><label>Текст</label>
            <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Что нового…" /></div>
          <div className="field"><label>Картинка{editId ? " (выбери файл, чтобы заменить)" : " (необязательно)"}</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-dim)", margin: "4px 0 14px" }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: "auto" }} /> Закрепить вверху
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={publish} disabled={saving}>
              {saving ? "Сохраняем…" : editId ? "Сохранить изменения" : "Опубликовать"}
            </button>
            {editId && <button className="btn btn-ghost" onClick={() => { resetForm(); setShow(false); }}>Отмена</button>}
            {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Новостей пока нет.</p>
      ) : items.map((n) => (
        <div key={n.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 13, padding: "13px 16px", marginBottom: 10,
        }}>
          <div>
            <b style={{ fontSize: 14 }}>{n.is_pinned && <span style={{ color: "var(--accent-3)" }}>📌 </span>}{n.title}</b>
            <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
              {new Date(n.created_at).toLocaleDateString("ru-RU")}{n.is_pinned ? " · закреплено" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(n)}>Изменить</button>
            <button className="btn btn-ghost btn-sm" onClick={() => remove(n.id)}>Удалить</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── ВЫБОР РЕДАКЦИИ ───────────────────────────
type CuratedItem = {
  id: number; style: "look" | "workshop" | "event"; tag: string; title: string;
  meta: string; link: string; image: string | null; image_url: string;
  order: number; is_active: boolean;
};
const CURATED_STYLE_RU: Record<string, string> = {
  look: "Образ (розовый, крупный)", workshop: "Мастерская (голубой)", event: "Событие (жёлтый)",
};

function CuratedAdmin() {
  const [items, setItems] = useState<CuratedItem[]>([]);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [f, setF] = useState({ style: "look", tag: "", title: "", meta: "", link: "", image_url: "", order: "0", is_active: true });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function load() {
    api("/admin-panel/curated/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(load, []);

  function resetForm() {
    setEditId(null); setFile(null); setErr("");
    setF({ style: "look", tag: "", title: "", meta: "", link: "", image_url: "", order: "0", is_active: true });
  }
  function startEdit(c: CuratedItem) {
    setEditId(c.id); setFile(null); setErr(""); setShow(true);
    setF({ style: c.style, tag: c.tag || "", title: c.title, meta: c.meta || "", link: c.link || "",
      image_url: c.image_url || "", order: String(c.order), is_active: c.is_active });
  }

  async function save() {
    if (!f.title.trim()) { setErr("Введите заголовок"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("style", f.style);
      fd.append("tag", f.tag);
      fd.append("title", f.title);
      fd.append("meta", f.meta);
      fd.append("link", f.link);
      fd.append("image_url", f.image_url);
      fd.append("order", String(parseInt(f.order, 10) || 0));
      fd.append("is_active", f.is_active ? "true" : "false");
      if (file) fd.append("image", file);
      const res = editId
        ? await api(`/admin-panel/curated/${editId}/`, { method: "PATCH", body: fd })
        : await api("/admin-panel/curated/", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.title || "Не удалось"); }
      resetForm(); setShow(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  async function toggle(c: CuratedItem) {
    const res = await api(`/admin-panel/curated/${c.id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    if (res.ok) { const d = await res.json(); setItems((p) => p.map((x) => (x.id === d.id ? d : x))); }
  }

  async function remove(id: number) {
    if (!confirm("Удалить карточку?")) return;
    const res = await api(`/admin-panel/curated/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="acc-card" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: 0 }}>Выбор редакции</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { if (show) { resetForm(); setShow(false); } else { resetForm(); setShow(true); } }}>
          {show ? "Отмена" : "+ Добавить карточку"}
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 16px" }}>
        Блок «Выбор редакции» на главной. Порядок задаёт «Порядок» (меньше — левее/выше). Первая карточка — крупная.
        Если ничего не добавлено — на главной показывается стандартный набор.
      </p>

      {show && (
        <div style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editId ? "Редактировать карточку" : "Новая карточка"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
            <div className="field"><label>Стиль карточки</label>
              <select value={f.style} onChange={(e) => setF({ ...f, style: e.target.value })}>
                {Object.entries(CURATED_STYLE_RU).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
              </select></div>
            <div className="field"><label>Порядок</label>
              <input type="number" value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} /></div>
          </div>
          <div className="field"><label>Метка</label>
            <input value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} placeholder="★ Образ недели" /></div>
          <div className="field"><label>Заголовок</label>
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Zeri от ZAKOS — League of Legends" /></div>
          <div className="field"><label>Подпись</label>
            <input value={f.meta} onChange={(e) => setF({ ...f, meta: e.target.value })} placeholder="12 400 просмотров · 890 ♥" /></div>
          <div className="field"><label>Ссылка</label>
            <input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="/people/1" /></div>
          <div className="field"><label>Картинка (файл){editId ? " — выбери, чтобы заменить" : ""}</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <div className="field"><label>…или ссылка на картинку</label>
            <input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://…" /></div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-dim)", margin: "4px 0 14px" }}>
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} style={{ width: "auto" }} /> Показывать на главной
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Сохраняем…" : editId ? "Сохранить" : "Добавить"}
            </button>
            {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Карточек пока нет — на главной показывается стандартный набор.</p>
      ) : items.map((c) => (
        <div key={c.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 13, padding: "12px 16px", marginBottom: 10,
          opacity: c.is_active ? 1 : 0.5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 54, height: 40, borderRadius: 8, flexShrink: 0, border: "1px solid var(--line)",
              background: c.image ? `center/cover url('${c.image}')` : "var(--bg-2)",
            }} />
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 14 }}>{c.tag && <span style={{ color: "var(--ink-dim)" }}>{c.tag} · </span>}{c.title}</b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                {CURATED_STYLE_RU[c.style]} · порядок {c.order}{c.link ? ` · → ${c.link}` : ""}{!c.is_active ? " · скрыта" : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Изменить</button>
            <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.is_active ? "Скрыть" : "Показать"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => remove(c.id)}>Удалить</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── КАТЕГОРИИ (лента) ───────────────────────────
type CategoryItem = { id: number; label: string; link: string; order: number; is_active: boolean };

function CategoriesAdmin() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function load() {
    api("/admin-panel/categories/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(load, []);

  async function add() {
    if (!label.trim()) { setErr("Введите название"); return; }
    setSaving(true); setErr("");
    try {
      const res = await api("/admin-panel/categories/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), link: link.trim(), order: items.length }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.label || "Не удалось"); }
      setLabel(""); setLink(""); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  async function patch(c: CategoryItem, body: Partial<CategoryItem>) {
    const res = await api(`/admin-panel/categories/${c.id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) { const d = await res.json(); setItems((p) => p.map((x) => (x.id === d.id ? d : x))); }
  }

  async function remove(id: number) {
    if (!confirm("Удалить категорию?")) return;
    const res = await api(`/admin-panel/categories/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="acc-card" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 24 }}>
      <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: 0 }}>Категории</h2>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 16px" }}>
        Бегущая лента на главной. Ссылка необязательна. Если пусто — показывается стандартный набор.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
        <div className="field" style={{ flex: "1 1 160px", marginBottom: 0 }}><label>Название</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="3D-печать"
            onKeyDown={(e) => { if (e.key === "Enter") add(); }} /></div>
        <div className="field" style={{ flex: "1 1 160px", marginBottom: 0 }}><label>Ссылка (опц.)</label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/workshops" /></div>
        <button className="btn btn-primary btn-sm" onClick={add} disabled={saving}>{saving ? "…" : "+ Добавить"}</button>
      </div>
      {err && <p style={{ color: "var(--red)", fontSize: 12, marginTop: -8, marginBottom: 12 }}>{err}</p>}

      {items.length === 0 ? (
        <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Категорий пока нет — на главной показывается стандартный набор.</p>
      ) : items.map((c) => (
        <div key={c.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 11, padding: "10px 14px", marginBottom: 8,
          opacity: c.is_active ? 1 : 0.5,
        }}>
          <div>
            <b style={{ fontSize: 14 }}>{c.label}</b>
            <span style={{ fontSize: 12, color: "var(--ink-dim)", marginLeft: 8 }}>
              порядок {c.order}{c.link ? ` · → ${c.link}` : ""}{!c.is_active ? " · скрыта" : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => patch(c, { order: Math.max(0, c.order - 1) })} title="Выше">↑</button>
            <button className="btn btn-ghost btn-sm" onClick={() => patch(c, { order: c.order + 1 })} title="Ниже">↓</button>
            <button className="btn btn-ghost btn-sm" onClick={() => patch(c, { is_active: !c.is_active })}>{c.is_active ? "Скрыть" : "Показать"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => remove(c.id)}>Удалить</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── ИНВАЙТЫ ───────────────────────────
type InviteItem = {
  id: number; code: string; note: string; max_uses: number; used_count: number;
  is_active: boolean; has_room: boolean; created_by: string; created_at: string; users: string[];
};

function InvitesAdmin() {
  const [items, setItems] = useState<InviteItem[]>([]);
  const [show, setShow] = useState(false);
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  function load() {
    api("/admin-panel/invites/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(load, []);

  function inviteLink(code: string) {
    return `${window.location.origin}/auth/register?invite=${code}`;
  }

  async function copyLink(inv: InviteItem) {
    try {
      await navigator.clipboard.writeText(inviteLink(inv.code));
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId((p) => (p === inv.id ? null : p)), 1500);
    } catch { prompt("Скопируй ссылку:", inviteLink(inv.code)); }
  }

  async function create() {
    setSaving(true); setErr("");
    try {
      const res = await api("/admin-panel/invites/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), max_uses: Math.max(0, parseInt(maxUses, 10) || 0) }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Не удалось"); }
      setNote(""); setMaxUses("1"); setShow(false);
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  async function toggleActive(inv: InviteItem) {
    const res = await api(`/admin-panel/invites/${inv.id}/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !inv.is_active }),
    });
    if (res.ok) { const d = await res.json(); setItems((p) => p.map((x) => (x.id === d.id ? d : x))); }
  }

  async function remove(inv: InviteItem) {
    if (!confirm(`Удалить инвайт ${inv.code}? Зарегистрированные по нему останутся.`)) return;
    const res = await api(`/admin-panel/invites/${inv.id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((x) => x.id !== inv.id));
  }

  return (
    <div className="acc-card" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: 0 }}>Инвайты</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setErr(""); setShow((v) => !v); }}>
          {show ? "Отмена" : "+ Создать инвайт"}
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 16px" }}>
        Регистрация открыта для всех. Инвайты необязательны — используй их для точечных приглашений или закрытых наборов. «Ссылка» копирует готовую инвайт-ссылку — отправь её человеку или в чат.
      </p>

      {show && (
        <div style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Новый инвайт</h3>
          <div className="field"><label>Заметка (для кого)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Чат косплееров Астаны" /></div>
          <div className="field"><label>Лимит использований (0 = безлимит)</label>
            <input type="number" min={0} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} style={{ maxWidth: 160 }} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={create} disabled={saving}>
              {saving ? "Создаём…" : "Создать"}
            </button>
            {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Инвайтов пока нет — создай первый.</p>
      ) : items.map((inv) => (
        <div key={inv.id} style={{
          background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 13,
          padding: "13px 16px", marginBottom: 10, opacity: inv.has_room ? 1 : 0.6,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontFamily: "var(--font-mono),monospace", fontSize: 15, letterSpacing: 1 }}>{inv.code}</b>
              {inv.note && <span style={{ fontSize: 13, color: "var(--ink-dim)", marginLeft: 10 }}>{inv.note}</span>}
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 3 }}>
                Использован: {inv.used_count}{inv.max_uses > 0 ? ` / ${inv.max_uses}` : " (безлимит)"}
                {" · "}{fmtDate(inv.created_at)}
                {inv.created_by && ` · создал ${inv.created_by}`}
                {!inv.is_active && <span style={{ color: "var(--red)" }}> · отключён</span>}
                {inv.is_active && !inv.has_room && <span style={{ color: "var(--accent-3)" }}> · исчерпан</span>}
              </div>
              {inv.users.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 3 }}>
                  Пришли: {inv.users.join(", ")}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => copyLink(inv)}>
                {copiedId === inv.id ? "✓ Скопировано" : "⎘ Ссылка"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(inv)}>
                {inv.is_active ? "Отключить" : "Включить"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(inv)}>Удалить</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── ПОЛЬЗОВАТЕЛИ ───────────────────────────
function UsersAdmin({ roleFilter = "" }: { roleFilter?: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState(roleFilter);
  const [statusF, setStatusF] = useState("");
  const locked = !!roleFilter; // вкладка «Локации» — роль зафиксирована
  const [expanded, setExpanded] = useState<{ id: number; mode: "roles" | "subs" | "pass" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (roleF) p.set("role", roleF);
    if (statusF) p.set("status", statusF);
    const qs = p.toString();
    api(`/admin-panel/users/${qs ? `?${qs}` : ""}`)
      .then((r) => (r.ok ? r.json() : [])).then((d) => setUsers(Array.isArray(d) ? d : []));
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, roleF, statusF]);

  function patchUser(u: AdminUser) { setUsers((p) => p.map((x) => (x.id === u.id ? u : x))); }

  async function toggleActive(u: AdminUser) {
    const next = !u.is_active;
    if (!confirm(next ? `Разблокировать ${u.username}?` : `Заблокировать ${u.username}? Он не сможет войти.`)) return;
    const res = await api(`/admin-panel/users/${u.id}/set-active/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: next }),
    });
    if (res.ok) { patchUser(await res.json()); }
    else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
  }

  async function removeUser(u: AdminUser) {
    if (!confirm(`Удалить аккаунт ${u.username} НАВСЕГДА? Восстановить нельзя.`)) return;
    if (!confirm(`Точно удалить ${u.username}? Будут стёрты профиль, подписки, заказы.`)) return;
    const res = await api(`/admin-panel/users/${u.id}/delete/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setUsers((p) => p.filter((x) => x.id !== u.id));
    else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
  }

  return (
    <div className="acc-card" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 24 }}>
      <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: 0 }}>
        {roleFilter === "location" ? "Локации (фотозоны)" : roleFilter === "shop" ? "Магазины" : "Пользователи"}
      </h2>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 14px" }}>
        {roleFilter === "location" ? "Профили с ролью «Локация»: анкета (тип/цена/вместимость) — в кнопке «Роли». Блокировка и удаление как у юзеров."
         : roleFilter === "shop" ? "Профили с ролью «Магазин»: товары магазина — в кнопке «Роли» (создать/править/удалить). Блокировка и удаление как у юзеров."
         : "Поиск и фильтры, создание аккаунтов, роли, блокировка и удаление."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ник / email / телефон" style={{ flex: "1 1 200px", minWidth: 160 }} />
        {!locked && (
          <select value={roleF} onChange={(e) => setRoleF(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">Все роли</option>
            {ROLE_LIST.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
        )}
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">Любой статус</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
          <option value="staff">Админы</option>
        </select>
      </div>

      <button className="btn btn-primary btn-sm" style={{ marginBottom: 14 }} onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "Отмена" : "+ Создать пользователя"}
      </button>
      {showCreate && <CreateUser onDone={() => { setShowCreate(false); load(); }} />}

      {users.map((u) => (
        <div key={u.id} style={{ background: "var(--bg-3)", border: `1px solid ${u.is_active ? "var(--line)" : "rgba(255,84,112,.4)"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, opacity: u.is_active ? 1 : 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: u.avatar ? `center/cover url('${u.avatar}')` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
            }} />
            <div style={{ flex: 1, minWidth: 150 }}>
              <b style={{ fontSize: 14 }}>{u.username}
                {u.is_staff && <span style={{ color: "var(--accent-2)", fontSize: 11, marginLeft: 6 }}>admin</span>}
                {!u.is_active && <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 6 }}>заблокирован</span>}
              </b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                {u.email || u.phone || "—"} · {u.followers} подп.
              </div>
              <div style={{ marginTop: 4 }}>
                {(u.roles.length ? u.roles : ["—"]).map((r) => (
                  <span key={r} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, marginRight: 4,
                    background: "rgba(157,124,255,.1)", border: "1px solid rgba(157,124,255,.25)", color: "var(--accent-4)" }}>
                    {ROLE_RU[r] || r}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["roles", "subs", "pass"] as const).map((m) => (
                <button key={m} className="btn btn-ghost btn-sm"
                  onClick={() => setExpanded((e) => (e && e.id === u.id && e.mode === m ? null : { id: u.id, mode: m }))}>
                  {m === "roles" ? "Роли" : m === "subs" ? "Подписки" : "Пароль"}
                </button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}
                style={{ color: u.is_active ? "var(--accent-3)" : "var(--green)" }}>
                {u.is_active ? "Заблокировать" : "Разблокировать"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => removeUser(u)} style={{ color: "var(--red)" }}>
                Удалить
              </button>
            </div>
          </div>

          {expanded?.id === u.id && expanded.mode === "roles" && <RolesEditor user={u} onSaved={patchUser} />}
          {expanded?.id === u.id && expanded.mode === "subs" && <SubsEditor user={u} />}
          {expanded?.id === u.id && expanded.mode === "pass" && <PassEditor user={u} onDone={() => setExpanded(null)} />}
        </div>
      ))}
      {users.length === 0 && <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Ничего не найдено.</p>}
    </div>
  );
}

function CreateUser({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ username: "", identifier: "", password: "", role: "fan" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true); setErr("");
    try {
      const res = await api("/admin-panel/users/", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Не удалось"); }
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }
  return (
    <div style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
        <div className="field"><label>Ник</label><input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="new_cosplayer" /></div>
        <div className="field"><label>Email или телефон</label><input value={f.identifier} onChange={(e) => setF({ ...f, identifier: e.target.value })} placeholder="name@mail.ru" /></div>
        <div className="field"><label>Пароль</label><input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="мин. 10 символов" /></div>
        <div className="field"><label>Стартовая роль</label>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {ROLE_LIST.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>{saving ? "Создаём…" : "Создать аккаунт"}</button>
        {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
      </div>
    </div>
  );
}

function RolesEditor({ user, onSaved }: { user: AdminUser; onSaved: (u: AdminUser) => void }) {
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [details, setDetails] = useState<Record<string, any>>(user.role_details || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  function toggle(slug: string) { setRoles((p) => (p.includes(slug) ? p.filter((r) => r !== slug) : [...p, slug])); }
  function setField(role: string, key: string, value: any) {
    setDetails((prev) => ({ ...prev, [role]: { ...(prev[role] || {}), [key]: value } }));
  }
  async function save() {
    setSaving(true); setSaved(false);
    const res = await api(`/admin-panel/users/${user.id}/set-roles/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles, role_details: details }),
    });
    if (res.ok) { const u = await res.json(); onSaved(u); setSaved(true); setTimeout(() => setSaved(false), 1800); }
    setSaving(false);
  }
  // Роли, у которых есть анкета и которые сейчас включены.
  const withForms = roles.filter((r) => ROLE_FORMS[r]);
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {ROLE_LIST.map((r) => (
          <button key={r.slug} onClick={() => toggle(r.slug)}
            className={`btn btn-sm ${roles.includes(r.slug) ? "btn-primary" : "btn-ghost"}`}>
            {roles.includes(r.slug) ? "✓ " : ""}{r.name}
          </button>
        ))}
      </div>

      {withForms.map((role) => {
        const cfg = ROLE_FORMS[role];
        return (
          <div key={role} style={{ marginBottom: 12, padding: 14, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
            <h4 style={{ margin: "0 0 2px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--accent-2)" }}>{cfg.icon}</span> {cfg.title}
            </h4>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>{cfg.hint}</p>
            <RoleFields role={role} values={details[role] || {}} onChange={(k, v) => setField(role, k, v)} />
            {(role === "location"
              || (role === "photographer" && !roles.includes("location"))
              || (role === "cosplayer" && !roles.includes("location") && !roles.includes("photographer"))) && (
              <AdminLocationGallery userId={user.id} roles={roles} isPro={!!user.is_pro} />
            )}
          </div>
        );
      })}

      <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Сохраняем…" : "Сохранить роли и анкеты"}</button>
      {saved && <span style={{ color: "var(--green)", fontSize: 12, marginLeft: 10 }}>✓ Сохранено</span>}

      {roles.includes("workshop") && <WorkshopEditor userId={user.id} />}
      {roles.includes("shop") && <ShopProductsEditor userId={user.id} />}
      {roles.includes("location") && <AdminSlotsEditor userId={user.id} />}
    </div>
  );
}

// Слоты аренды локации (за юзера): создать/удалить/скрыть + заявки на бронь.
type AdminSlot = {
  id: number; title: string; date: string; time_start: string; time_end: string;
  price: number | null; is_active: boolean; is_booked: boolean;
  requests: { id: number; username: string; status: string; comment: string }[] | null;
};
function AdminSlotsEditor({ userId }: { userId: number }) {
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [form, setForm] = useState({ title: "", date: "", time_start: "", time_end: "", price: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const SLOT_BOOK_RU: Record<string, string> = {
    pending: "заявка", approved: "подтверждена", declined: "отклонена", cancelled: "отменена гостем",
  };
  const fmtT = (t: string) => (t || "").slice(0, 5);

  function load() {
    api(`/admin-panel/users/${userId}/slots/`).then((r) => (r.ok ? r.json() : [])).then((d) => setSlots(Array.isArray(d) ? d : []));
  }
  useEffect(load, [userId]);

  async function create() {
    setErr("");
    if (!form.date || !form.time_start || !form.time_end) { setErr("Укажи дату и время"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(), date: form.date, time_start: form.time_start, time_end: form.time_end,
      };
      const digits = form.price.replace(/\D/g, "");
      if (digits) body.price = parseInt(digits, 10);
      const res = await api(`/admin-panel/users/${userId}/slots/`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setSlots((p) => [...p, d]); setForm({ title: "", date: "", time_start: "", time_end: "", price: "" }); }
      else setErr(d.detail || "Не удалось");
    } finally { setSaving(false); }
  }

  async function toggle(s: AdminSlot) {
    const res = await api(`/admin-panel/slots/${s.id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    if (res.ok) { const d = await res.json(); setSlots((p) => p.map((x) => (x.id === d.id ? d : x))); }
  }

  async function remove(id: number) {
    if (!confirm("Удалить слот вместе с заявками?")) return;
    const res = await api(`/admin-panel/slots/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setSlots((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <h4 style={{ margin: "0 0 4px", fontSize: 14 }}>⌖ Слоты аренды</h4>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>
        Слоты локации за юзера. Подтверждение заявок — у владельца в кабинете; здесь модерация (скрыть/удалить).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div className="field"><label>Название (опц.)</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Зал А" /></div>
        <div className="field"><label>Дата</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div className="field"><label>С</label>
          <input type="time" value={form.time_start} onChange={(e) => setForm({ ...form, time_start: e.target.value })} /></div>
        <div className="field"><label>До</label>
          <input type="time" value={form.time_end} onChange={(e) => setForm({ ...form, time_end: e.target.value })} /></div>
      </div>
      <div className="field"><label>Цена, ₸ (пусто = договорная)</label>
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" style={{ maxWidth: 180 }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={create} disabled={saving}>{saving ? "Сохраняем…" : "+ Добавить слот"}</button>
        {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
      </div>
      {slots.map((s) => (
        <div key={s.id} style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", marginBottom: 8, opacity: s.is_active ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
            <span>
              <b>{fmtDate(s.date)} {fmtT(s.time_start)}–{fmtT(s.time_end)}</b>
              {s.title && ` · ${s.title}`} · {s.price ? `${s.price.toLocaleString("ru-RU")} ₸` : "договорная"}
              {s.is_booked && <span style={{ color: "var(--green)" }}> · забронирован</span>}
              {!s.is_active && <span style={{ color: "var(--red)" }}> · скрыт</span>}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(s)}>{s.is_active ? "Скрыть" : "Показать"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(s.id)}>Удалить</button>
            </span>
          </div>
          {Array.isArray(s.requests) && s.requests.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 4 }}>
              Заявки: {s.requests.map((b) => `${b.username} (${SLOT_BOOK_RU[b.status] || b.status})`).join(", ")}
            </div>
          )}
        </div>
      ))}
      {slots.length === 0 && <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: 0 }}>Слотов нет.</p>}
    </div>
  );
}

// Фотогалерея в админке (за юзера). Лимит зависит от ролей (Локация 20 / Фотограф 15).
function AdminLocationGallery({ userId, roles, isPro }: { userId: number; roles: string[]; isPro?: boolean }) {
  const [photos, setPhotos] = useState<{ id: number; url: string }[]>([]);
  const [up, setUp] = useState(false);
  const [err, setErr] = useState("");
  const MAX = galleryLimit(roles, !!isPro);
  const isPhotographer = roles.includes("photographer") && !roles.includes("location");
  function load() {
    api(`/admin-panel/users/${userId}/photos/`).then((r) => (r.ok ? r.json() : [])).then((d) => setPhotos(Array.isArray(d) ? d : []));
  }
  useEffect(load, [userId]);
  async function upload(file: File) {
    setErr("");
    if (photos.length >= MAX) { setErr(`Лимит ${MAX} фото`); return; }
    if (file.size > 5 * 1024 * 1024) { setErr("Максимум 5 МБ"); return; }
    setUp(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await api(`/admin-panel/users/${userId}/photos/`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setPhotos((p) => [...p, d]); else setErr(d.detail || "Не удалось");
    } finally { setUp(false); }
  }
  async function remove(id: number) {
    const res = await api(`/admin-panel/users/${userId}/photos/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setPhotos((p) => p.filter((x) => x.id !== id));
  }
  return (
    <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>{isPhotographer ? "◐ Портфолио (фото)" : "⌖ Фотогалерея локации"}</h4>
        <span style={{ fontSize: 12, color: photos.length >= MAX ? "var(--accent-3)" : "var(--ink-dim)" }}>{photos.length} / {MAX}</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>
        {isPhotographer ? "Загрузи работы фотографа за юзера." : "Загрузи фото площадки за юзера."} ≤5 МБ каждое.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 10 }}>
        {photos.map((p) => (
          <div key={p.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
            <div style={{ width: "100%", height: "100%", backgroundImage: `url('${p.url}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <button onClick={() => remove(p.id)} title="Удалить"
              style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none",
                background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
          </div>
        ))}
        {photos.length < MAX && (
          <label style={{ aspectRatio: "1", borderRadius: 10, border: "1px dashed var(--line)", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: up ? "wait" : "pointer", color: "var(--ink-dim)", fontSize: 24 }}>
            {up ? "…" : "+"}
            <input type="file" accept="image/*" style={{ display: "none" }} disabled={up}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {err && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{err}</p>}
    </div>
  );
}

// Мастерская — отдельная сущность (не role_details). Редактор мастерских юзера.
type WsServiceRow = { name: string; price_from: string };
type WsFull = { id: number; name: string; type: string; city: string; about: string; eta: string; services: { name: string; price_from: number }[] };
function WorkshopEditor({ userId }: { userId: number }) {
  const [items, setItems] = useState<WsFull[]>([]);
  const [draft, setDraft] = useState<Record<number, { name: string; type: string; city: string; eta: string; about: string; services: WsServiceRow[] }>>({});
  const [showNew, setShowNew] = useState(false);
  const [nw, setNw] = useState({ name: "", type: "print3d", city: "", eta: "", about: "", services: [{ name: "", price_from: "" }] as WsServiceRow[] });
  const [msg, setMsg] = useState("");

  function load() {
    api(`/admin-panel/users/${userId}/workshops/`).then((r) => (r.ok ? r.json() : [])).then((d: WsFull[]) => {
      const list = Array.isArray(d) ? d : [];
      setItems(list);
      const dr: any = {};
      list.forEach((w) => { dr[w.id] = { name: w.name, type: w.type, city: w.city, eta: w.eta || "", about: w.about || "",
        services: (w.services || []).map((s) => ({ name: s.name, price_from: String(s.price_from) })) }; });
      setDraft(dr);
    });
  }
  useEffect(load, [userId]);

  function svcArr(services: WsServiceRow[]) {
    return services.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), description: "", price_from: parseInt(s.price_from) || 0 }));
  }
  async function saveWs(id: number) {
    const d = draft[id];
    const res = await api(`/admin-panel/workshops/${id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name, type: d.type, city: d.city, eta: d.eta, about: d.about, services: svcArr(d.services) }),
    });
    if (res.ok) { setMsg("Мастерская сохранена ✓"); setTimeout(() => setMsg(""), 2000); load(); }
    else { const e = await res.json().catch(() => ({})); alert(e.name || e.detail || "Ошибка"); }
  }
  async function createWs() {
    if (!nw.name.trim()) { alert("Введите название"); return; }
    const res = await api(`/admin-panel/users/${userId}/workshops/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nw.name, type: nw.type, city: nw.city, eta: nw.eta, about: nw.about, services: svcArr(nw.services) }),
    });
    if (res.ok) { setShowNew(false); setNw({ name: "", type: "print3d", city: "", eta: "", about: "", services: [{ name: "", price_from: "" }] }); load(); }
    else { const e = await res.json().catch(() => ({})); alert(e.name || e.detail || "Ошибка"); }
  }
  async function delWs(id: number) {
    if (!confirm("Удалить мастерскую?")) return;
    const res = await api(`/admin-panel/workshops/${id}/delete/`, { method: "DELETE" });
    if (res.ok || res.status === 204) load();
  }

  function setD(id: number, patch: Partial<{ name: string; type: string; city: string; eta: string; about: string; services: WsServiceRow[] }>) {
    setDraft((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  }

  return (
    <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h4 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--accent-2)" }}>⚒</span> Мастерские юзера ({items.length})
        </h4>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowNew((v) => !v)}>{showNew ? "Отмена" : "+ Добавить"}</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>Мастерская — отдельная сущность с услугами. Заполни за юзера, если он не может.</p>
      {msg && <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 8 }}>{msg}</div>}

      {showNew && <WsForm v={nw} onChange={(patch) => setNw((p) => ({ ...p, ...patch }))} onSubmit={createWs} submitLabel="Создать мастерскую" />}

      {items.map((w) => draft[w.id] && (
        <div key={w.id} style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <WsForm v={draft[w.id]} onChange={(patch) => setD(w.id, patch)} onSubmit={() => saveWs(w.id)} submitLabel="Сохранить" onDelete={() => delWs(w.id)} />
        </div>
      ))}
    </div>
  );
}

function WsForm({ v, onChange, onSubmit, submitLabel, onDelete }: {
  v: { name: string; type: string; city: string; eta: string; about: string; services: WsServiceRow[] };
  onChange: (patch: any) => void; onSubmit: () => void; submitLabel: string; onDelete?: () => void;
}) {
  function setSvc(i: number, patch: Partial<WsServiceRow>) {
    const services = v.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ services });
  }
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div className="field"><label>Название</label><input value={v.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="EVA Forge" /></div>
        <div className="field"><label>Тип</label>
          <select value={v.type} onChange={(e) => onChange({ type: e.target.value })}>
            {Object.entries(WS_TYPE_RU).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          </select></div>
        <div className="field"><label>Город</label><input value={v.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="Алматы" /></div>
        <div className="field"><label>Срок</label><input value={v.eta} onChange={(e) => onChange({ eta: e.target.value })} placeholder="7-14 дней" /></div>
      </div>
      <div className="field"><label>Описание</label><textarea rows={2} value={v.about} onChange={(e) => onChange({ about: e.target.value })} placeholder="Чем занимается мастерская…" /></div>
      <label style={{ fontSize: 12, color: "var(--ink-dim)" }}>Услуги</label>
      {v.services.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input value={s.name} onChange={(e) => setSvc(i, { name: e.target.value })} placeholder="Услуга (напр. Шлем)" style={{ flex: 2 }} />
          <input type="number" value={s.price_from} onChange={(e) => setSvc(i, { price_from: e.target.value })} placeholder="₸ от" style={{ flex: 1, minWidth: 0 }} />
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}
        onClick={() => onChange({ services: [...v.services, { name: "", price_from: "" }] })}>+ услуга</button>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={onSubmit}>{submitLabel}</button>
        {onDelete && <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={onDelete}>Удалить</button>}
      </div>
    </div>
  );
}

// ── Товары магазина внутри редактора роли (полный CRUD за магазин) ──
type ProdFull = { id: number; title: string; price: number | null; status: string; category: string; description: string; image: string | null };
const PROD_ST: [string, string][] = [["in_stock", "В наличии"], ["on_order", "На заказ"], ["sold", "Продано"]];
type ProdDraft = { title: string; price: string; status: string; category: string; description: string; file: File | null };
const emptyProd: ProdDraft = { title: "", price: "", status: "in_stock", category: "", description: "", file: null };

function ShopProductsEditor({ userId }: { userId: number }) {
  const [items, setItems] = useState<ProdFull[]>([]);
  const [draft, setDraft] = useState<Record<number, ProdDraft>>({});
  const [showNew, setShowNew] = useState(false);
  const [nw, setNw] = useState<ProdDraft>({ ...emptyProd });
  const [msg, setMsg] = useState("");

  function load() {
    api(`/admin-panel/users/${userId}/products/`).then((r) => (r.ok ? r.json() : [])).then((d: ProdFull[]) => {
      const list = Array.isArray(d) ? d : [];
      setItems(list);
      const dr: Record<number, ProdDraft> = {};
      list.forEach((p) => { dr[p.id] = { title: p.title, price: p.price != null ? String(p.price) : "", status: p.status, category: p.category || "", description: p.description || "", file: null }; });
      setDraft(dr);
    });
  }
  useEffect(load, [userId]);

  function body(d: ProdDraft) {
    const fd = new FormData();
    fd.append("title", d.title.trim());
    const digits = d.price.replace(/\D/g, "");
    if (digits) fd.append("price", digits);  // пусто не шлём — DRF IntegerField падает на ""
    fd.append("status", d.status);
    fd.append("category", d.category.trim());
    fd.append("description", d.description.trim());
    if (d.file) fd.append("image", d.file);
    return fd;
  }
  async function create() {
    if (!nw.title.trim()) { alert("Введите название"); return; }
    const res = await api(`/admin-panel/users/${userId}/products/`, { method: "POST", body: body(nw) });
    if (res.ok) { setShowNew(false); setNw({ ...emptyProd }); load(); }
    else { const e = await res.json().catch(() => ({})); alert(e.image?.[0] || e.detail || "Ошибка"); }
  }
  async function save(id: number) {
    const res = await api(`/admin-panel/products/${id}/update/`, { method: "PATCH", body: body(draft[id]) });
    if (res.ok) { setMsg("Товар сохранён ✓"); setTimeout(() => setMsg(""), 2000); load(); }
    else { const e = await res.json().catch(() => ({})); alert(e.image?.[0] || e.detail || "Ошибка"); }
  }
  async function remove(id: number) {
    if (!confirm("Удалить товар?")) return;
    const res = await api(`/admin-panel/products/${id}/delete/`, { method: "DELETE" });
    if (res.ok || res.status === 204) load();
  }
  function setD(id: number, patch: Partial<ProdDraft>) { setDraft((p) => ({ ...p, [id]: { ...p[id], ...patch } })); }

  return (
    <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h4 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--accent-2)" }}>▦</span> Товары магазина ({items.length})
        </h4>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowNew((v) => !v)}>{showNew ? "Отмена" : "+ Добавить"}</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>Товары видны в витрине магазина на его профиле. Заполни за магазин, если он не может.</p>
      {msg && <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 8 }}>{msg}</div>}

      {showNew && <ProdForm v={nw} onChange={(patch) => setNw((p) => ({ ...p, ...patch }))} onSubmit={create} submitLabel="Создать товар" />}

      {items.map((p) => draft[p.id] && (
        <div key={p.id} style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            {p.image && <div style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${p.image}')` }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProdForm v={draft[p.id]} onChange={(patch) => setD(p.id, patch)} onSubmit={() => save(p.id)} submitLabel="Сохранить" onDelete={() => remove(p.id)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProdForm({ v, onChange, onSubmit, submitLabel, onDelete }: {
  v: ProdDraft; onChange: (patch: Partial<ProdDraft>) => void; onSubmit: () => void; submitLabel: string; onDelete?: () => void;
}) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div className="field"><label>Название</label><input value={v.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Парик длинный, блонд" /></div>
        <div className="field"><label>Цена, ₸ (пусто = по запросу)</label><input value={v.price} onChange={(e) => onChange({ price: e.target.value })} placeholder="9900" inputMode="numeric" /></div>
        <div className="field"><label>Категория</label><input value={v.category} onChange={(e) => onChange({ category: e.target.value })} placeholder="Парики" /></div>
        <div className="field"><label>Статус</label>
          <select value={v.status} onChange={(e) => onChange({ status: e.target.value })}>
            {PROD_ST.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          </select></div>
      </div>
      <div className="field"><label>Описание</label><textarea rows={2} value={v.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Материал, размер, состояние…" /></div>
      <div className="field"><label>Фото {onDelete ? "(заменить)" : ""}</label><input type="file" accept="image/*" onChange={(e) => onChange({ file: e.target.files?.[0] || null })} /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={onSubmit}>{submitLabel}</button>
        {onDelete && <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={onDelete}>Удалить</button>}
      </div>
    </div>
  );
}

function SubsEditor({ user }: { user: AdminUser }) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    api(`/admin-panel/users/${user.id}/subscriptions/`)
      .then((r) => (r.ok ? r.json() : [])).then((d) => { setSubs(Array.isArray(d) ? d : []); setLoading(false); });
  }
  useEffect(load, [user.id]);
  async function unsub(targetId: number) {
    const res = await api(`/admin-panel/users/${user.id}/subscriptions/${targetId}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setSubs((p) => p.filter((s) => s.target_id !== targetId));
  }
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
      {loading ? <span style={{ color: "var(--ink-dim)", fontSize: 13 }}>Загрузка…</span>
        : subs.length === 0 ? <span style={{ color: "var(--ink-dim)", fontSize: 13 }}>Подписок нет.</span>
        : subs.map((s) => (
          <div key={s.target_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 14 }}>
            <span>@{s.username}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => unsub(s.target_id)}>Отписать</button>
          </div>
        ))}
    </div>
  );
}

function PassEditor({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true); setErr("");
    const res = await api(`/admin-panel/users/${user.id}/reset-password/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) { setDone(true); setTimeout(onDone, 1200); }
    else { const e = await res.json().catch(() => ({})); setErr(e.detail || "Ошибка"); }
    setSaving(false);
  }
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <input value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="новый пароль (≥10)" style={{ maxWidth: 240 }} />
      <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Задать пароль</button>
      {done && <span style={{ color: "var(--green)", fontSize: 12 }}>✓ Готово</span>}
      {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
    </div>
  );
}

// ─────────────────────────── ОБЩЕЕ ───────────────────────────
function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 24 }}>
      <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 16px" }}>{sub}</p>}
      {children}
    </div>
  );
}
const rowStyle: CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
  background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 13, padding: "13px 16px", marginBottom: 10,
};

// ─────────────────────────── ДАШБОРД ───────────────────────────
function Dashboard({ onGo }: { onGo: (t: TabId) => void }) {
  const [s, setS] = useState<Record<string, number> | null>(null);
  useEffect(() => { api("/admin-panel/stats/").then((r) => (r.ok ? r.json() : null)).then(setS); }, []);

  const cards: { label: string; value: number; tab?: TabId; accent?: string }[] = s ? [
    { label: "Посещений сегодня", value: s.visits_today, accent: "var(--accent-2)" },
    { label: "Посещений за 7 дней", value: s.visits_7d, accent: "var(--accent-2)" },
    { label: "Посещений всего", value: s.visits_total, accent: "var(--accent-2)" },
    { label: "Пользователей", value: s.users_total, tab: "users" },
    { label: "Активных", value: s.users_active, accent: "var(--green)" },
    { label: "Заблокировано", value: s.users_blocked, accent: "var(--red)" },
    { label: "Новых за 7 дней", value: s.users_new_7d, accent: "var(--accent-2)" },
    { label: "Локаций", value: s.locations, tab: "locations" },
    { label: "Мастерских", value: s.workshops, tab: "workshops" },
    { label: "Объявлений (актив.)", value: s.listings_active, tab: "listings" },
    { label: "Заказов (открытых)", value: s.orders_open, tab: "orders", accent: "var(--accent-3)" },
    { label: "Новостей", value: s.news, tab: "news" },
    { label: "Событий", value: s.events, tab: "news" },
    { label: "Гайдов", value: s.guides, tab: "guides" },
    { label: "Образов", value: s.looks, tab: "looks" },
    { label: "Команд", value: s.teams, tab: "teams" },
  ] : [];

  return (
    <Card title="Дашборд" sub="Сводка по платформе. Клик по карточке — переход в раздел.">
      {!s ? <p style={{ color: "var(--ink-dim)" }}>Загрузка…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          {cards.map((c) => (
            <div key={c.label} onClick={() => c.tab && onGo(c.tab)}
              style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", cursor: c.tab ? "pointer" : "default" }}>
              <div style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, color: c.accent || "var(--ink)" }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────── МАСТЕРСКИЕ ───────────────────────────
type WsRow = { id: number; name: string; type: string; city: string; owner: string; is_pro: boolean; services: number; orders_count: number; created_at: string };
function WorkshopsAdmin() {
  const [items, setItems] = useState<WsRow[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  function load() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (type) p.set("type", type);
    api(`/admin-panel/workshops/${p.toString() ? `?${p}` : ""}`).then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, type]);
  async function remove(w: WsRow) {
    if (!confirm(`Удалить мастерскую «${w.name}»? Заказы к ней тоже удалятся.`)) return;
    const res = await api(`/admin-panel/workshops/${w.id}/delete/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((x) => x.id !== w.id));
  }
  return (
    <Card title="Мастерские" sub="Все мастерские платформы. Поиск, модерация, удаление.">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 название / город / владелец" style={{ flex: "1 1 200px" }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">Все типы</option>
          {Object.entries(WS_TYPE_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Ничего не найдено.</p>
        : items.map((w) => (
          <div key={w.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <b style={{ fontSize: 14 }}>{w.name}{w.is_pro && <span style={{ color: "var(--accent-3)", fontSize: 11, marginLeft: 6 }}>PRO</span>}</b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                {WS_TYPE_RU[w.type] || w.type} · {w.city || "—"} · @{w.owner} · услуг: {w.services} · заказов: {w.orders_count}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="btn btn-ghost btn-sm" href={`/workshops/${w.id}`} target="_blank" rel="noopener noreferrer">Открыть</a>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => remove(w)}>Удалить</button>
            </div>
          </div>
        ))}
    </Card>
  );
}

// ─────────────────────────── СОБЫТИЯ ───────────────────────────
type EventRow = { id: number; title: string; description: string; city: string; place: string; date: string; going: number; is_published: boolean; day: number | string; month: string };
function EventsAdmin() {
  const [items, setItems] = useState<EventRow[]>([]);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [f, setF] = useState({ title: "", description: "", city: "", place: "", date: "", going: "" });
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function load() {
    api("/events/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(d.results ?? d ?? []));
  }
  useEffect(load, []);
  function reset() { setEditId(null); setF({ title: "", description: "", city: "", place: "", date: "", going: "" }); setCover(null); setErr(""); }
  function startEdit(e: EventRow) {
    setEditId(e.id); setF({ title: e.title, description: e.description || "", city: e.city || "", place: e.place || "", date: e.date, going: String(e.going || "") });
    setCover(null); setErr(""); setShow(true);
  }
  async function save() {
    if (!f.title.trim() || !f.date) { setErr("Нужны название и дата"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", f.title); fd.append("description", f.description); fd.append("city", f.city);
      fd.append("place", f.place); fd.append("date", f.date); fd.append("going", f.going || "0");
      if (cover) fd.append("cover", cover);
      const res = editId
        ? await api(`/events/${editId}/`, { method: "PATCH", body: fd })
        : await api("/events/", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || e.date || "Не удалось"); }
      reset(); setShow(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }
  async function remove(id: number) {
    if (!confirm("Удалить событие?")) return;
    const res = await api(`/events/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((e) => e.id !== id));
  }

  return (
    <Card title="События" sub="Сходки, конвенты, фотосеты. Видны всем на /events и на главной.">
      <button className="btn btn-primary btn-sm" style={{ marginBottom: 14 }}
        onClick={() => { if (show) { reset(); setShow(false); } else { reset(); setShow(true); } }}>
        {show ? "Отмена" : "+ Добавить событие"}
      </button>
      {show && (
        <div style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editId ? "Редактировать событие" : "Новое событие"}</h3>
          <div className="field"><label>Название</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Edgerunners сет — Алматы" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
            <div className="field"><label>Дата</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="field"><label>Город</label><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Алматы" /></div>
            <div className="field"><label>Место (опц.)</label><input value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} placeholder="ТРЦ Mega, 3 этаж" /></div>
            <div className="field"><label>Идут (число)</label><input type="number" value={f.going} onChange={(e) => setF({ ...f, going: e.target.value })} placeholder="23" /></div>
          </div>
          <div className="field"><label>Описание</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Что за событие…" /></div>
          <div className="field"><label>Обложка (опц.)</label><input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Сохраняем…" : editId ? "Сохранить" : "Опубликовать"}</button>
            {editId && <button className="btn btn-ghost" onClick={() => { reset(); setShow(false); }}>Отмена</button>}
            {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
          </div>
        </div>
      )}
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Событий пока нет.</p>
        : items.map((e) => (
          <div key={e.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <b style={{ fontSize: 14 }}>{e.day} {e.month} · {e.title}</b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                {e.place ? `${e.place} · ` : ""}{e.city || "—"} · идут: {e.going}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(e)}>Изменить</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => remove(e.id)}>Удалить</button>
            </div>
          </div>
        ))}
    </Card>
  );
}

// ─────────────────────────── ГАЙДЫ ───────────────────────────
type GuideRow = { id: number; title: string; summary: string; body: string; category: string; author_name: string; created_at: string };
function GuidesAdmin() {
  const [items, setItems] = useState<GuideRow[]>([]);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [f, setF] = useState({ title: "", summary: "", body: "", category: "" });
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function load() { api("/guides/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(d.results ?? d ?? [])); }
  useEffect(load, []);
  function reset() { setEditId(null); setF({ title: "", summary: "", body: "", category: "" }); setCover(null); setErr(""); }
  function startEdit(g: GuideRow) {
    setEditId(g.id); setF({ title: g.title, summary: g.summary || "", body: g.body || "", category: g.category || "" });
    setCover(null); setErr(""); setShow(true);
  }
  async function save() {
    if (!f.title.trim()) { setErr("Нужен заголовок"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", f.title); fd.append("summary", f.summary); fd.append("body", f.body); fd.append("category", f.category);
      if (cover) fd.append("cover", cover);
      const res = editId ? await api(`/guides/${editId}/`, { method: "PATCH", body: fd })
                         : await api("/guides/", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Не удалось"); }
      reset(); setShow(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }
  async function remove(id: number) {
    if (!confirm("Удалить гайд?")) return;
    const res = await api(`/guides/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((g) => g.id !== id));
  }
  return (
    <Card title="Гайды" sub="Туториалы по крафту. Видны всем на /guides.">
      <button className="btn btn-primary btn-sm" style={{ marginBottom: 14 }}
        onClick={() => { if (show) { reset(); setShow(false); } else { reset(); setShow(true); } }}>
        {show ? "Отмена" : "+ Добавить гайд"}
      </button>
      {show && (
        <div style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editId ? "Редактировать гайд" : "Новый гайд"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0 14px" }}>
            <div className="field"><label>Заголовок</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Термоформовка EVA: основы" /></div>
            <div className="field"><label>Категория</label><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="EVA / Парики / Грим…" /></div>
          </div>
          <div className="field"><label>Кратко (анонс)</label><input value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="О чём гайд в одну строку" /></div>
          <div className="field"><label>Текст</label><textarea rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Полный текст гайда…" /></div>
          <div className="field"><label>Обложка (опц.)</label><input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Сохраняем…" : editId ? "Сохранить" : "Опубликовать"}</button>
            {editId && <button className="btn btn-ghost" onClick={() => { reset(); setShow(false); }}>Отмена</button>}
            {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
          </div>
        </div>
      )}
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Гайдов пока нет.</p>
        : items.map((g) => (
          <div key={g.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <b style={{ fontSize: 14 }}>{g.category ? `[${g.category}] ` : ""}{g.title}</b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                {g.author_name ? `@${g.author_name}` : "—"}{g.summary ? ` · ${g.summary}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(g)}>Изменить</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => remove(g.id)}>Удалить</button>
            </div>
          </div>
        ))}
    </Card>
  );
}

// ─────────────────────────── ОБРАЗЫ (модерация) ───────────────────────────
type LookRow = { id: number; title: string; character: string; image: string | null; is_published: boolean; author_name: string; likes_count: number };
function LooksAdmin() {
  const [items, setItems] = useState<LookRow[]>([]);
  function load() { api("/looks/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(d.results ?? d ?? [])); }
  useEffect(load, []);
  async function togglePub(l: LookRow) {
    const res = await api(`/looks/${l.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: !l.is_published }) });
    if (res.ok) { const d = await res.json(); setItems((p) => p.map((x) => (x.id === l.id ? { ...x, is_published: d.is_published } : x))); }
  }
  async function remove(l: LookRow) {
    if (!confirm(`Удалить образ «${l.title}»?`)) return;
    const res = await api(`/looks/${l.id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((x) => x.id !== l.id));
  }
  return (
    <Card title="Образы" sub="Лента образов косплееров (/looks). Модерация: скрыть или удалить.">
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Образов пока нет.</p>
        : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          {items.map((l) => (
            <div key={l.id} style={{ background: "var(--bg-3)", border: `1px solid ${l.is_published ? "var(--line)" : "rgba(255,84,112,.4)"}`, borderRadius: 12, overflow: "hidden", opacity: l.is_published ? 1 : 0.6 }}>
              <div style={{ aspectRatio: "3/4", backgroundSize: "cover", backgroundPosition: "center",
                backgroundImage: `url('${l.image || "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=300&q=80"}')` }} />
              <div style={{ padding: "8px 10px" }}>
                <b style={{ fontSize: 13 }}>{l.title}</b>
                <div style={{ fontSize: 11, color: "var(--ink-dim)", margin: "2px 0 8px" }}>@{l.author_name} · ♥ {l.likes_count}{!l.is_published ? " · скрыт" : ""}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, padding: "5px 6px" }} onClick={() => togglePub(l)}>{l.is_published ? "Скрыть" : "Показать"}</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)", padding: "5px 8px" }} onClick={() => remove(l)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────── КОМАНДЫ (модерация) ───────────────────────────
type TeamRow = { id: number; name: string; city: string; captain_name: string; members_count: number; likes_count: number; is_active: boolean; is_open: boolean };
function TeamsAdmin() {
  const [items, setItems] = useState<TeamRow[]>([]);
  function load() { api("/teams/").then((r) => (r.ok ? r.json() : [])).then((d) => setItems(d.results ?? d ?? [])); }
  useEffect(load, []);
  async function toggle(t: TeamRow) {
    const res = await api(`/teams/${t.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !t.is_active }) });
    if (res.ok) { const d = await res.json(); setItems((p) => p.map((x) => (x.id === t.id ? { ...x, is_active: d.is_active } : x))); }
  }
  async function remove(t: TeamRow) {
    if (!confirm(`Удалить команду «${t.name}»?`)) return;
    const res = await api(`/teams/${t.id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((x) => x.id !== t.id));
  }
  return (
    <Card title="Команды" sub="Косплей-команды (/teams). Модерация: скрыть или удалить.">
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Команд пока нет.</p>
        : items.map((t) => (
          <div key={t.id} style={{ ...rowStyle, opacity: t.is_active ? 1 : 0.55 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <b style={{ fontSize: 14 }}>{t.name}{!t.is_active && <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 6 }}>скрыта</span>}</b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                капитан @{t.captain_name || "—"} · {t.city || "—"} · {t.members_count} участн. · ♥ {t.likes_count}{t.is_open ? " · набор открыт" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="btn btn-ghost btn-sm" href={`/teams/${t.id}`} target="_blank" rel="noopener noreferrer">Открыть</a>
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(t)}>{t.is_active ? "Скрыть" : "Показать"}</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => remove(t)}>Удалить</button>
            </div>
          </div>
        ))}
    </Card>
  );
}

// ─────────────────────────── ТОВАРЫ ───────────────────────────
type ProdRow = { id: number; title: string; price: number | null; status: string; image: string | null; is_active: boolean; owner: string; created_at: string };
const PROD_STATUS_RU: Record<string, string> = { in_stock: "В наличии", on_order: "На заказ", sold: "Продано" };
function ProductsAdmin() {
  const [items, setItems] = useState<ProdRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  function load() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    api(`/admin-panel/products/${p.toString() ? `?${p}` : ""}`).then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, status]);
  async function toggle(p: ProdRow) {
    const res = await api(`/admin-panel/products/${p.id}/set-active/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !p.is_active }) });
    if (res.ok) { const d = await res.json(); setItems((arr) => arr.map((x) => (x.id === p.id ? { ...x, is_active: d.is_active } : x))); }
  }
  async function remove(p: ProdRow) {
    if (!confirm(`Удалить товар «${p.title}»?`)) return;
    const res = await api(`/admin-panel/products/${p.id}/delete/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((arr) => arr.filter((x) => x.id !== p.id));
  }
  return (
    <Card title="Товары" sub="Витрины магазинов. Модерация: скрыть или удалить.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input placeholder="Поиск по названию/продавцу" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 200px" }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Все</option><option value="active">Активные</option><option value="hidden">Скрытые</option>
        </select>
      </div>
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Товаров пока нет.</p>
        : items.map((p) => (
          <div key={p.id} style={{ ...rowStyle, opacity: p.is_active ? 1 : 0.55 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 180 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, backgroundSize: "cover", backgroundPosition: "center",
                background: p.image ? `center/cover url('${p.image}')` : "var(--bg)" }} />
              <div>
                <b style={{ fontSize: 14 }}>{p.title}{!p.is_active && <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 6 }}>скрыт</span>}</b>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>@{p.owner || "—"} · {p.price != null ? `${p.price.toLocaleString("ru-RU")} ₸` : "по запросу"} · {PROD_STATUS_RU[p.status] || p.status}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="btn btn-ghost btn-sm" href={`/products/${p.id}`} target="_blank" rel="noopener noreferrer">Открыть</a>
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)}>{p.is_active ? "Скрыть" : "Показать"}</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => remove(p)}>Удалить</button>
            </div>
          </div>
        ))}
    </Card>
  );
}

// ─────────────────────────── ОБЪЯВЛЕНИЯ ───────────────────────────
type ListRow = { id: number; title: string; type: string; city: string; price: number | null; description?: string; is_active: boolean; owner: string; created_at: string };
function ListingsAdmin() {
  const [items, setItems] = useState<ListRow[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", type: "job", city: "", description: "", price: "" });
  const [saving, setSaving] = useState(false);
  function startEdit(l: ListRow) {
    setEditId(l.id);
    setForm({ title: l.title || "", type: l.type || "job", city: l.city || "", description: l.description || "", price: l.price != null ? String(l.price) : "" });
  }
  async function saveEdit() {
    if (editId === null) return;
    setSaving(true);
    try {
      const res = await api(`/admin-panel/listings/${editId}/update/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, type: form.type, city: form.city, description: form.description, price: form.price ? parseInt(form.price) : null }),
      });
      if (res.ok) { const d = await res.json(); setItems((p) => p.map((x) => (x.id === editId ? { ...x, ...d } : x))); setEditId(null); }
    } finally { setSaving(false); }
  }
  function load() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (type) p.set("type", type);
    if (status) p.set("status", status);
    api(`/admin-panel/listings/${p.toString() ? `?${p}` : ""}`).then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, type, status]);
  async function toggle(l: ListRow) {
    const res = await api(`/admin-panel/listings/${l.id}/set-active/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !l.is_active }),
    });
    if (res.ok) { const d = await res.json(); setItems((p) => p.map((x) => (x.id === l.id ? { ...x, is_active: d.is_active } : x))); }
  }
  async function remove(l: ListRow) {
    if (!confirm(`Удалить объявление «${l.title}»?`)) return;
    const res = await api(`/admin-panel/listings/${l.id}/delete/`, { method: "DELETE" });
    if (res.ok || res.status === 204) setItems((p) => p.filter((x) => x.id !== l.id));
  }
  return (
    <Card title="Объявления" sub="Все объявления юзеров (барахолка + слоты/коллабы). Скрывай спам/нарушения, редактируй или удаляй.">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 заголовок / город / автор" style={{ flex: "1 1 180px" }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">Все типы</option>
          {Object.entries(LISTING_TYPE_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">Любой статус</option>
          <option value="active">Активные</option>
          <option value="hidden">Скрытые</option>
        </select>
      </div>
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Ничего не найдено.</p>
        : items.map((l) => (
          editId === l.id ? (
            <div key={l.id} style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ maxWidth: 150 }}>
                  {Object.entries(LISTING_TYPE_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Город" style={{ flex: "1 1 120px" }} />
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="₸" style={{ maxWidth: 110 }} />
              </div>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Заголовок" />
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Описание" />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving || !form.title.trim()}>{saving ? "Сохраняем…" : "Сохранить"}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Отмена</button>
              </div>
            </div>
          ) : (
          <div key={l.id} style={{ ...rowStyle, opacity: l.is_active ? 1 : 0.55 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <b style={{ fontSize: 14 }}>{l.title}{!l.is_active && <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 6 }}>скрыто</span>}</b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                {LISTING_TYPE_RU[l.type] || l.type} · {l.city || "—"}{l.price ? ` · ${l.price}₸` : ""} · @{l.owner} · {fmtDate(l.created_at)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(l)}>Изменить</button>
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(l)}>{l.is_active ? "Скрыть" : "Показать"}</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => remove(l)}>Удалить</button>
            </div>
          </div>
          )
        ))}
    </Card>
  );
}

// ─────────────────────────── ЗАКАЗЫ ───────────────────────────
type OrderRow = { id: number; customer: string; workshop: string; description: string; budget: number | null; status: string; status_display: string; created_at: string };
function OrdersAdmin() {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  function load() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    api(`/admin-panel/orders/${p.toString() ? `?${p}` : ""}`).then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, status]);
  async function setOrderStatus(o: OrderRow, st: string) {
    const res = await api(`/admin-panel/orders/${o.id}/set-status/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: st }),
    });
    if (res.ok) setItems((p) => p.map((x) => (x.id === o.id ? { ...x, status: st, status_display: ORDER_STATUS_RU[st] || st } : x)));
  }
  return (
    <Card title="Заказы" sub="Все заказы между юзерами и мастерскими. Можно сменить статус для разбора споров.">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 мастерская / заказчик / описание" style={{ flex: "1 1 200px" }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">Любой статус</option>
          {Object.entries(ORDER_STATUS_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Заказов нет.</p>
        : items.map((o) => (
          <div key={o.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <b style={{ fontSize: 14 }}>#{o.id} · @{o.customer} → {o.workshop}</b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                {o.description?.slice(0, 80)}{o.description?.length > 80 ? "…" : ""}{o.budget ? ` · ${o.budget}₸` : ""} · {fmtDate(o.created_at)}
              </div>
            </div>
            <select value={o.status} onChange={(e) => setOrderStatus(o, e.target.value)} style={{ maxWidth: 150 }}>
              {Object.entries(ORDER_STATUS_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        ))}
    </Card>
  );
}

// ─────────────────────────── ПОДПИСКИ PRO ───────────────────────────
type SubRow = {
  id: number; plan: string; plan_display: string; workshop: number | null; workshop_name: string | null;
  user_id: number; user_username: string; source: string; active_until: string | null;
  disabled: boolean; status: string; note: string; price: number;
};

function SubscriptionsAdmin() {
  const [items, setItems] = useState<SubRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");

  // выдача Pro
  const [userQ, setUserQ] = useState("");
  const [userRes, setUserRes] = useState<AdminUser[]>([]);

  function load() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    api(`/admin-panel/subscriptions/${p.toString() ? `?${p}` : ""}`)
      .then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : []));
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, status]);

  useEffect(() => {
    const term = userQ.trim();
    if (term.length < 2) { setUserRes([]); return; }
    const t = setTimeout(() => {
      api(`/admin-panel/users/?q=${encodeURIComponent(term)}`).then((r) => (r.ok ? r.json() : []))
        .then((d) => setUserRes(Array.isArray(d) ? d : []));
    }, 300);
    return () => clearTimeout(t);
  }, [userQ]);

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(""), 2500); }

  async function patch(id: number, body: Record<string, unknown>, ok: string) {
    const res = await api(`/admin-panel/subscriptions/${id}/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) { load(); flash(ok); }
    else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
  }

  async function grantPro(u: AdminUser, unlimited: boolean) {
    const res = await api(`/admin-panel/subscriptions/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: u.id, plan: "pro", unlimited, months: unlimited ? undefined : 6 }),
    });
    if (res.ok) { setUserQ(""); setUserRes([]); load(); flash(`Pro выдан @${u.username}`); }
    else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
  }

  async function del(s: SubRow) {
    if (!confirm(`Удалить подписку #${s.id} (${PLAN_RU[s.plan]}) у @${s.user_username}?`)) return;
    const res = await api(`/admin-panel/subscriptions/${s.id}/`, { method: "DELETE" });
    if (res.ok) { load(); flash("Подписка удалена"); }
  }

  return (
    <Card title="Подписки Pro" sub="Единый тариф: Pro покрывает профиль и все мастерские юзера. Активна, пока не истёк срок (пусто = бессрочно). После подключения оплаты продление будет автоматическим.">
      {msg && <div style={{ color: "var(--green)", fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      {/* Выдать Pro вручную */}
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Выдать Pro профилю</h3>
      <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="🔍 найди юзера по нику / email / телефону" style={{ marginBottom: 10 }} />
      {userRes.map((u) => (
        <div key={u.id} style={rowStyle}>
          <div>
            <b style={{ fontSize: 14 }}>{u.username}{u.is_pro && <span style={{ color: "var(--accent-3)", fontSize: 11, marginLeft: 6 }}>уже Pro</span>}</b>
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{u.email || u.phone || "—"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => grantPro(u, false)}>+6 мес</button>
            <button className="btn btn-ghost btn-sm" onClick={() => grantPro(u, true)}>Бессрочно</button>
          </div>
        </div>
      ))}

      {/* Фильтры списка */}
      <h3 style={{ margin: "22px 0 10px", fontSize: 15 }}>Все подписки ({items.length})</h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 юзер" style={{ flex: "1 1 200px" }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">Любой статус</option>
          {Object.entries(SUB_STATUS_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {items.length === 0 ? <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Подписок нет.</p>
        : items.map((s) => (
          <div key={s.id} style={{ ...rowStyle, alignItems: "flex-start", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 200 }}>
                <b style={{ fontSize: 14 }}>
                  {PLAN_RU[s.plan] || s.plan}{s.workshop_name ? ` · ${s.workshop_name}` : ""}
                </b>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                  @{s.user_username} · {s.active_until ? `до ${fmtDate(s.active_until)}` : "бессрочно"} · {s.source}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", height: "fit-content",
                background: "rgba(0,0,0,.3)", color: SUB_STATUS_COLOR[s.status] || "var(--ink)",
                border: `1px solid ${SUB_STATUS_COLOR[s.status] || "var(--line)"}33` }}>
                {SUB_STATUS_RU[s.status] || s.status}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => patch(s.id, { add_months: 1 }, "Продлено на месяц")}>+1 мес</button>
              <button className="btn btn-ghost btn-sm" onClick={() => patch(s.id, { add_months: 6 }, "Продлено на 6 мес")}>+6 мес</button>
              <button className="btn btn-ghost btn-sm" onClick={() => patch(s.id, { active_until: "" }, "Сделано бессрочной")}>Бессрочно</button>
              <input type="date" defaultValue={s.active_until ? s.active_until.slice(0, 10) : ""}
                onChange={(e) => patch(s.id, { active_until: e.target.value }, "Дата обновлена")}
                style={{ maxWidth: 150 }} title="Активна до" />
              <button className="btn btn-ghost btn-sm" style={{ color: s.disabled ? "var(--green)" : "var(--accent-3)" }}
                onClick={() => patch(s.id, { disabled: !s.disabled }, s.disabled ? "Включена" : "Отключена")}>
                {s.disabled ? "Включить" : "Отключить"}
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => del(s)}>Удалить</button>
            </div>
          </div>
        ))}
    </Card>
  );
}

// ─────────────────────────── АДМИНЫ ───────────────────────────
function AdminsAdmin() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [msg, setMsg] = useState("");

  function loadAdmins() {
    api("/admin-panel/users/?status=staff").then((r) => (r.ok ? r.json() : [])).then((d) => setAdmins(Array.isArray(d) ? d : []));
  }
  useEffect(loadAdmins, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      api(`/admin-panel/users/?q=${encodeURIComponent(term)}`).then((r) => (r.ok ? r.json() : []))
        .then((d) => setResults((Array.isArray(d) ? d : []).filter((u: AdminUser) => !u.is_staff)));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function setStaff(u: AdminUser, next: boolean) {
    const word = next ? `Выдать ${u.username} права администратора?` : `Снять админа с ${u.username}?`;
    if (!confirm(word)) return;
    const res = await api(`/admin-panel/users/${u.id}/set-staff/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_staff: next }),
    });
    if (res.ok) {
      loadAdmins(); setQ(""); setResults([]);
      setMsg(next ? `${u.username} теперь админ ✓` : `${u.username} больше не админ`);
      setTimeout(() => setMsg(""), 2500);
    } else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
  }

  return (
    <Card title="Админы" sub="Кто имеет доступ к этой панели. Назначай заместителей (напр. на отпуск) и снимай права.">
      {msg && <div style={{ color: "var(--green)", fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Текущие админы ({admins.length})</h3>
      {admins.map((u) => (
        <div key={u.id} style={rowStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%",
              background: u.avatar ? `center/cover url('${u.avatar}')` : "linear-gradient(135deg,var(--accent),var(--accent-4))" }} />
            <div>
              <b style={{ fontSize: 14 }}>{u.username} <span style={{ color: "var(--accent-2)", fontSize: 11 }}>admin</span></b>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{u.email || u.phone || "—"}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => setStaff(u, false)}>Снять админа</button>
        </div>
      ))}

      <h3 style={{ margin: "22px 0 10px", fontSize: 15 }}>Назначить нового админа</h3>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 найди юзера по нику / email / телефону" style={{ marginBottom: 12 }} />
      {q.trim().length >= 2 && results.length === 0 && (
        <p style={{ color: "var(--ink-dim)", fontSize: 13 }}>Подходящих (не-админов) не найдено.</p>
      )}
      {results.map((u) => (
        <div key={u.id} style={rowStyle}>
          <div>
            <b style={{ fontSize: 14 }}>{u.username}{!u.is_active && <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 6 }}>заблокирован</span>}</b>
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{u.email || u.phone || "—"}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setStaff(u, true)}>Сделать админом</button>
        </div>
      ))}
    </Card>
  );
}
