"use client";
import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";

const PH_COVER = "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&q=80";
const PH_LOOK = "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=300&q=80";

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [t, setT] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  function load() {
    api(`/teams/${id}/`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { setNotFound(true); return; }
      setT(d);
      setForm({ name: d.name, city: d.city, about: d.about, contact: d.contact, instagram: d.instagram, tiktok: d.tiktok, is_open: d.is_open });
    });
  }
  useEffect(load, [id]);
  useEffect(() => {
    if (t && t.my_status === "captain") api(`/events/`).then((r) => (r.ok ? r.json() : [])).then((d) => setAllEvents(d.results ?? d ?? []));
  }, [t?.my_status]);

  if (notFound) return <div className="wrap" style={{ padding: 48 }}><h1>Команда не найдена</h1><a href="/teams" className="btn btn-ghost">← К командам</a></div>;
  if (!t) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  const isCaptain = t.my_status === "captain";

  async function gated(fn: () => Promise<void>) {
    const me = await api("/auth/me/");
    if (!me.ok) { router.push(`/auth/login?next=/teams/${id}`); return; }
    await fn();
  }
  const join = () => gated(async () => { await api(`/teams/${id}/join/`, { method: "POST" }); load(); });
  const leave = () => gated(async () => { await api(`/teams/${id}/leave/`, { method: "DELETE" }); load(); });
  const like = () => gated(async () => {
    const res = await api(`/teams/${id}/like/`, { method: t.is_liked ? "DELETE" : "POST" });
    if (res.ok) { const d = await res.json(); setT((p: any) => ({ ...p, is_liked: d.is_liked, likes_count: d.likes_count })); }
  });
  async function member(uid: number, action: string, role_in_team?: string) {
    await api(`/teams/${id}/members/${uid}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, role_in_team }) });
    load();
  }
  async function attachEvent(eid: string) { if (!eid) return; await api(`/teams/${id}/events/${eid}/`, { method: "POST" }); load(); }
  async function detachEvent(eid: number) { await api(`/teams/${id}/events/${eid}/`, { method: "DELETE" }); load(); }
  async function saveEdit() {
    const res = await api(`/teams/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setEdit(false); load(); }
  }
  async function removeTeam() {
    if (!confirm("Удалить команду навсегда?")) return;
    const res = await api(`/teams/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) router.push("/teams");
  }

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div style={{ height: 220, borderRadius: 18, margin: "16px 0 0", backgroundSize: "cover", backgroundPosition: "center",
        backgroundImage: `url('${t.cover || PH_COVER}')` }} />
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: -34, padding: "0 20px" }}>
        <div style={{ width: 80, height: 80, borderRadius: 18, border: "3px solid var(--bg)", flexShrink: 0,
          background: t.avatar ? `center/cover url('${t.avatar}')` : "linear-gradient(135deg,var(--accent),var(--accent-4))" }} />
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 26, margin: 0 }}>{t.name}</h1>
          <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>📍 {t.city || "—"} · {t.members_count} участн. · капитан @{t.captain_name}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={like} className="btn btn-ghost btn-sm" style={{ color: t.is_liked ? "var(--accent)" : undefined }}>{t.is_liked ? "♥" : "♡"} {t.likes_count}</button>
          {t.my_status === "none" || t.my_status === "guest" ? <button onClick={join} className="btn btn-primary btn-sm">{t.is_open ? "Вступить" : "Подать заявку"}</button> : null}
          {t.my_status === "pending" ? <button onClick={leave} className="btn btn-ghost btn-sm">Заявка отправлена · отменить</button> : null}
          {t.my_status === "member" ? <button onClick={leave} className="btn btn-ghost btn-sm">Выйти</button> : null}
        </div>
      </div>

      <div className="profile-grid" style={{ marginTop: 24 }}>
        <div>
          {t.about && <div className="about"><h3>О команде</h3><p style={{ whiteSpace: "pre-wrap" }}>{t.about}</p></div>}

          <div className="about">
            <h3>Состав ({t.members_count})</h3>
            {t.members.map((m: any) => (
              <div key={m.user_id} className="info-row" style={{ alignItems: "center" }}>
                <a href={`/people/${m.user_id}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: "50%", display: "inline-block",
                    background: m.avatar ? `center/cover url('${m.avatar}')` : "linear-gradient(135deg,var(--accent),var(--accent-4))" }} />
                  @{m.username}{m.is_captain && <span style={{ color: "var(--accent-3)", fontSize: 11, marginLeft: 4 }}>★ капитан</span>}
                </a>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{m.role_in_team}</span>
                  {isCaptain && !m.is_captain && (
                    <>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "3px 7px", fontSize: 11 }}
                        onClick={() => { const r = prompt("Роль в команде:", m.role_in_team); if (r != null) member(m.user_id, "role", r); }}>роль</button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "3px 7px", fontSize: 11, color: "var(--red)" }} onClick={() => member(m.user_id, "remove")}>×</button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>

          {t.looks?.length > 0 && (
            <div className="about">
              <h3>Образы команды</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {t.looks.map((l: any) => (
                  <div key={l.id} style={{ aspectRatio: "3/4", borderRadius: 10, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${l.image || PH_LOOK}')` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="about">
            <h3>Контакты</h3>
            {t.instagram && <div className="info-row"><span>Instagram</span><span>{t.instagram}</span></div>}
            {t.tiktok && <div className="info-row"><span>TikTok</span><span>{t.tiktok}</span></div>}
            {t.contact && <div className="info-row"><span>Связь</span><span>{t.contact}</span></div>}
            <div className="info-row"><span>Набор</span><span style={{ color: t.is_open ? "var(--green)" : "var(--ink-dim)" }}>{t.is_open ? "открыт" : "по заявке"}</span></div>
          </div>

          {t.events?.length > 0 && (
            <div className="about">
              <h3>События</h3>
              {t.events.map((e: any) => (
                <div key={e.id} className="info-row">
                  <span>{e.day} {e.month} · {e.title}</span>
                  {isCaptain && <button className="btn btn-ghost btn-sm" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => detachEvent(e.id)}>×</button>}
                </div>
              ))}
            </div>
          )}

          {isCaptain && (
            <div className="about" style={{ border: "1px solid rgba(255,210,74,.25)" }}>
              <h3 style={{ color: "var(--accent-3)" }}>Управление</h3>
              {t.pending?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 }}>Заявки ({t.pending.length})</div>
                  {t.pending.map((m: any) => (
                    <div key={m.user_id} className="info-row">
                      <span>@{m.username}</span>
                      <span style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-primary btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => member(m.user_id, "approve")}>принять</button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => member(m.user_id, "reject")}>отклонить</button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Добавить событие</label>
                <select defaultValue="" onChange={(e) => { attachEvent(e.target.value); e.target.value = ""; }}>
                  <option value="">— выбрать —</option>
                  {allEvents.map((e: any) => <option key={e.id} value={e.id}>{e.day} {e.month} · {e.title}</option>)}
                </select>
              </div>
              {!edit ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>Редактировать</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={removeTeam}>Удалить команду</button>
                </div>
              ) : (
                <div>
                  <div className="field"><label>Название</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="field"><label>Город</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div className="field"><label>Описание</label><textarea rows={3} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} /></div>
                  <div className="field"><label>Контакт</label><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-dim)", marginBottom: 10 }}>
                    <input type="checkbox" checked={form.is_open} onChange={(e) => setForm({ ...form, is_open: e.target.checked })} style={{ width: "auto" }} /> Открытый набор
                  </label>
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
