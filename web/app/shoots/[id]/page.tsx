"use client";
import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { SHOOT_ROLES, SHOOT_ROLE_RU, SHOOT_STATUS_RU } from "../../../lib/api";

const PH_COVER = "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=900&q=80";

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}

function Avatar({ src }: { src: string | null }) {
  return <span style={{ width: 30, height: 30, borderRadius: "50%", display: "inline-block", flexShrink: 0,
    background: src ? `center/cover url('${src}')` : "linear-gradient(135deg,var(--accent),var(--accent-4))" }} />;
}

export default function ShootDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [joinRole, setJoinRole] = useState("cosplayer");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [inv, setInv] = useState({ user_id: "", role: "cosplayer" });

  function load() {
    api(`/shoots/${id}/`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { setNotFound(true); return; }
      setS(d);
      setForm({ title: d.title, city: d.city, date: d.date || "", description: d.description,
        status: d.status, looking_for: d.looking_for || [] });
    });
  }
  useEffect(load, [id]);

  if (notFound) return <div className="wrap" style={{ padding: 48 }}><h1>Съёмка не найдена</h1><a href="/shoots" className="btn btn-ghost">← К съёмкам</a></div>;
  if (!s) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  const isOrg = s.is_organizer;
  const mine = s.my_participation;

  async function gated(fn: () => Promise<void>) {
    const me = await api("/auth/me/");
    if (!me.ok) { router.push(`/auth/login?next=/shoots/${id}`); return; }
    await fn();
  }
  const joinJSON = (body: any) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const apply = () => gated(async () => { await api(`/shoots/${id}/join/`, joinJSON({ role: joinRole })); load(); });
  const leave = () => gated(async () => { await api(`/shoots/${id}/join/`, { method: "DELETE" }); load(); });
  async function manage(partId: number, action: string) {
    await api(`/shoots/${id}/participants/${partId}/`, joinJSON({ action })); load();
  }
  async function invite() {
    if (!inv.user_id.trim()) return;
    const res = await api(`/shoots/${id}/invite/`, joinJSON({ user_id: Number(inv.user_id), role: inv.role }));
    if (res.ok) { setInv({ user_id: "", role: "cosplayer" }); load(); }
    else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось пригласить"); }
  }
  function toggleRole(key: string) {
    setForm((p: any) => ({ ...p, looking_for: p.looking_for.includes(key) ? p.looking_for.filter((r: string) => r !== key) : [...p.looking_for, key] }));
  }
  async function saveEdit() {
    const res = await api(`/shoots/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, date: form.date || null }) });
    if (res.ok) { setEdit(false); load(); }
  }
  async function removeShoot() {
    if (!confirm("Удалить съёмку навсегда?")) return;
    const res = await api(`/shoots/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) router.push("/shoots");
  }

  // Кнопка действия для зрителя/участника
  let actionBtn = null;
  if (!isOrg) {
    if (!mine) {
      actionBtn = (
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={joinRole} onChange={(e) => setJoinRole(e.target.value)} style={{ maxWidth: 150 }}>
            {SHOOT_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <button onClick={apply} className="btn btn-primary btn-sm">Откликнуться</button>
        </span>
      );
    } else if (mine.status === "requested") {
      actionBtn = <button onClick={leave} className="btn btn-ghost btn-sm">Заявка отправлена · отозвать</button>;
    } else if (mine.status === "invited") {
      actionBtn = (
        <span style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { const p = s.requests?.find((x: any) => x.status === "invited"); if (p) manage(p.id, "confirm"); }} className="btn btn-primary btn-sm">Принять приглашение</button>
          <button onClick={leave} className="btn btn-ghost btn-sm">Отказаться</button>
        </span>
      );
    } else if (mine.status === "confirmed") {
      actionBtn = <button onClick={leave} className="btn btn-ghost btn-sm">Вы в команде · выйти</button>;
    }
  }

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div style={{ height: 220, borderRadius: 18, margin: "16px 0 0", backgroundSize: "cover", backgroundPosition: "center",
        backgroundImage: `url('${s.cover || PH_COVER}')` }} />
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <span style={{ fontSize: 11, color: s.status === "open" ? "var(--green)" : "var(--ink-dim)",
            border: "1px solid var(--line)", borderRadius: 20, padding: "2px 9px" }}>{s.status_display}</span>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 26, margin: "10px 0 4px" }}>{s.title}</h1>
          <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
            📍 {s.city || "—"}{s.date ? ` · ${new Date(s.date).toLocaleDateString("ru-RU")}` : ""} · орг.{" "}
            {s.organizer.profile_id ? <a href={`/people/${s.organizer.profile_id}`}>@{s.organizer.username}</a> : `@${s.organizer.username}`}
          </div>
        </div>
        {actionBtn}
      </div>

      <div className="profile-grid" style={{ marginTop: 24 }}>
        <div>
          {s.description && <div className="about"><h3>Задумка</h3><p style={{ whiteSpace: "pre-wrap" }}>{s.description}</p></div>}

          <div className="about">
            <h3>Команда ({s.confirmed_count})</h3>
            {s.participants.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>Пока никого. {!isOrg && "Откликнитесь — будьте первым."}</p>}
            {s.participants.map((m: any) => (
              <div key={m.user_id} className="info-row" style={{ alignItems: "center" }}>
                <a href={m.profile_id ? `/people/${m.profile_id}` : "#"} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar src={m.avatar} /> @{m.username}
                </a>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--accent-2)" }}>{m.role_display}</span>
                  {isOrg && <button className="btn btn-ghost btn-sm" style={{ padding: "3px 7px", fontSize: 11, color: "var(--red)" }} onClick={() => manage(m.id, "remove")}>×</button>}
                </span>
              </div>
            ))}
          </div>

          {Array.isArray(s.looking_for) && s.looking_for.length > 0 && s.status === "open" && (
            <div className="about">
              <h3>Ищем в команду</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {s.looking_for.map((r: string) => (
                  <span key={r} style={{ fontSize: 13, color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.3)", borderRadius: 20, padding: "3px 12px" }}>{SHOOT_ROLE_RU[r] || r}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="about">
            <h3>Детали</h3>
            <div className="info-row"><span>Статус</span><span>{s.status_display}</span></div>
            {s.location_name && <div className="info-row"><span>Локация</span><span>{s.location_profile_id ? <a href={`/people/${s.location_profile_id}`}>{s.location_name}</a> : s.location_name}</span></div>}
            {s.workshop_name && <div className="info-row"><span>Мастерская</span><span><a href={`/workshops/${s.workshop}`}>{s.workshop_name}</a></span></div>}
          </div>

          {isOrg && (
            <div className="about" style={{ border: "1px solid rgba(255,210,74,.25)" }}>
              <h3 style={{ color: "var(--accent-3)" }}>Управление</h3>

              {s.requests?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 }}>Заявки и приглашения ({s.requests.length})</div>
                  {s.requests.map((m: any) => (
                    <div key={m.id} className="info-row" style={{ alignItems: "center" }}>
                      <a href={m.profile_id ? `/people/${m.profile_id}` : "#"} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar src={m.avatar} /> @{m.username}
                      </a>
                      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{m.role_display} · {m.status_display}</span>
                        {m.status === "requested" && <button className="btn btn-primary btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => manage(m.id, "confirm")}>взять</button>}
                        <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => manage(m.id, "decline")}>откл.</button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: "3px 7px", fontSize: 11, color: "var(--red)" }} onClick={() => manage(m.id, "remove")}>×</button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="field" style={{ marginBottom: 10 }}>
                <label>Пригласить по ID профиля</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={inv.user_id} onChange={(e) => setInv({ ...inv, user_id: e.target.value })} placeholder="user id" inputMode="numeric" style={{ flex: 1 }} />
                  <select value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })} style={{ maxWidth: 130 }}>
                    {SHOOT_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={invite}>Позвать</button>
                </div>
              </div>

              {!edit ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>Редактировать</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={removeShoot}>Удалить</button>
                </div>
              ) : (
                <div>
                  <div className="field"><label>Название</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="field"><label>Город</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div className="field"><label>Дата</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ colorScheme: "dark" }} /></div>
                  <div className="field"><label>Описание</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="field"><label>Статус</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {Object.entries(SHOOT_STATUS_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 6 }}>Кого ищем</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {SHOOT_ROLES.map((r) => {
                      const on = form.looking_for.includes(r.key);
                      return <button key={r.key} type="button" onClick={() => toggleRole(r.key)}
                        style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, cursor: "pointer",
                          border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`, background: on ? "rgba(255,45,111,.12)" : "transparent", color: on ? "var(--accent)" : "var(--ink-dim)" }}>{on ? "✓ " : ""}{r.label}</button>;
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>Сохранить</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>Отмена</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
