"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_LIST: { slug: string; name: string }[] = [
  { slug: "cosplayer", name: "Косплеер" }, { slug: "photographer", name: "Фотограф" },
  { slug: "workshop", name: "Мастерская" }, { slug: "shop", name: "Магазин" },
  { slug: "location", name: "Локация" }, { slug: "fan", name: "Фанат" },
];
const ROLE_RU: Record<string, string> = Object.fromEntries(ROLE_LIST.map((r) => [r.slug, r.name]));

type AdminUser = {
  id: number; username: string; email: string; phone: string; city: string;
  is_staff: boolean; is_verified: boolean; roles: string[]; profile_id: number | null;
  followers: number; following: number; avatar: string | null;
};
type NewsItem = { id: number; title: string; body: string; image: string | null; is_pinned: boolean; created_at: string };
type Sub = { target_id: number; username: string; avatar: string | null; since: string };

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}

export default function AdminPanelPage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null); // null=loading, false=нет доступа
  const [tab, setTab] = useState<"news" | "users">("news");

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
          {([["news", "◆ Новости"], ["users", "◇ Пользователи"]] as const).map(([id, label]) => (
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
        <div>{tab === "news" ? <NewsAdmin /> : <UsersAdmin />}</div>
      </div>
    </div>
  );
}

// ─────────────────────────── НОВОСТИ ───────────────────────────
function NewsAdmin() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [show, setShow] = useState(false);
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

  async function publish() {
    if (!title.trim()) { setErr("Введите заголовок"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("body", body);
      fd.append("is_pinned", pinned ? "true" : "false");
      if (image) fd.append("image", image);
      const res = await api("/news/", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Не удалось"); }
      setTitle(""); setBody(""); setPinned(false); setImage(null); setShow(false);
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
        <button className="btn btn-primary btn-sm" onClick={() => setShow((v) => !v)}>{show ? "Отмена" : "+ Добавить новость"}</button>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 16px" }}>Видны всем на странице /news.</p>

      {show && (
        <div style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div className="field"><label>Заголовок</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Открыта закрытая бета!" /></div>
          <div className="field"><label>Текст</label>
            <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Что нового…" /></div>
          <div className="field"><label>Картинка (необязательно)</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-dim)", margin: "4px 0 14px" }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: "auto" }} /> Закрепить вверху
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={publish} disabled={saving}>{saving ? "Публикуем…" : "Опубликовать"}</button>
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
          <button className="btn btn-ghost btn-sm" onClick={() => remove(n.id)}>Удалить</button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── ПОЛЬЗОВАТЕЛИ ───────────────────────────
function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<{ id: number; mode: "roles" | "subs" | "pass" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function load(query = "") {
    api(`/admin-panel/users/${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then((r) => (r.ok ? r.json() : [])).then((d) => setUsers(Array.isArray(d) ? d : []));
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(() => load(q), 300); return () => clearTimeout(t); }, [q]);

  function patchUser(u: AdminUser) { setUsers((p) => p.map((x) => (x.id === u.id ? u : x))); }

  return (
    <div className="acc-card" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: 0 }}>Пользователи</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ник / email / телефон" style={{ maxWidth: 260 }} />
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 16px" }}>Создавай аккаунты вручную, меняй роли и подписки.</p>

      <button className="btn btn-primary btn-sm" style={{ marginBottom: 14 }} onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "Отмена" : "+ Создать пользователя"}
      </button>
      {showCreate && <CreateUser onDone={() => { setShowCreate(false); load(q); }} />}

      {users.map((u) => (
        <div key={u.id} style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: u.avatar ? `center/cover url('${u.avatar}')` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
            }} />
            <div style={{ flex: 1, minWidth: 150 }}>
              <b style={{ fontSize: 14 }}>{u.username}{u.is_staff && <span style={{ color: "var(--accent-2)", fontSize: 11, marginLeft: 6 }}>admin</span>}</b>
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  function toggle(slug: string) { setRoles((p) => (p.includes(slug) ? p.filter((r) => r !== slug) : [...p, slug])); }
  async function save() {
    setSaving(true); setSaved(false);
    const res = await api(`/admin-panel/users/${user.id}/set-roles/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roles }),
    });
    if (res.ok) { const u = await res.json(); onSaved(u); setSaved(true); setTimeout(() => setSaved(false), 1800); }
    setSaving(false);
  }
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
      <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Сохраняем…" : "Сохранить роли"}</button>
      {saved && <span style={{ color: "var(--green)", fontSize: 12, marginLeft: 10 }}>✓ Сохранено</span>}
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
