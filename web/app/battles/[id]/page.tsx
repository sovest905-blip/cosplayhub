"use client";
import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { BATTLE_STATUS_RU } from "../../../lib/api";

const PH_COVER = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=900&q=80";
const PH_LOOK = "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=400&q=80";

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}
const json = (body: any) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function BattleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [b, setB] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [myLooks, setMyLooks] = useState<any[]>([]);
  const [pickLook, setPickLook] = useState("");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  function load() {
    api(`/battles/${id}/`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { setNotFound(true); return; }
      setB(d);
      setForm({ title: d.title, theme: d.theme, description: d.description,
        starts_at: d.starts_at || "", ends_at: d.ends_at || "" });
    });
  }
  useEffect(load, [id]);
  // подгружаем свои образы для заявки (если можно участвовать и ещё не участвую)
  useEffect(() => {
    if (b && b.can_enter && !b.my_entry) {
      api(`/looks/?mine=1`).then((r) => (r.ok ? r.json() : null)).then((d) => {
        const l = d?.results ?? d; if (Array.isArray(l)) setMyLooks(l);
      });
    }
  }, [b?.can_enter, b?.my_entry]);

  if (notFound) return <div className="wrap" style={{ padding: 48 }}><h1>Баттл не найден</h1><a href="/battles" className="btn btn-ghost">← К баттлам</a></div>;
  if (!b) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  async function gated(fn: () => Promise<void>) {
    const me = await api("/auth/me/");
    if (!me.ok) { router.push(`/auth/login?next=/battles/${id}`); return; }
    await fn();
  }
  const vote = (entryId: number, mine: boolean) => gated(async () => {
    await api(`/battles/${id}/vote/`, mine ? { method: "DELETE" } : json({ entry_id: entryId }));
    load();
  });
  const enter = () => gated(async () => {
    if (!pickLook) return;
    const res = await api(`/battles/${id}/enter/`, json({ look_id: Number(pickLook) }));
    if (res.ok) { setPickLook(""); load(); }
    else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
  });
  const unenter = () => gated(async () => { await api(`/battles/${id}/enter/`, { method: "DELETE" }); load(); });
  async function saveEdit() {
    const fd = new FormData();
    ["title", "theme", "description"].forEach((k) => fd.append(k, form[k] ?? ""));
    if (form.starts_at) fd.append("starts_at", form.starts_at);
    if (form.ends_at) fd.append("ends_at", form.ends_at);
    const res = await api(`/battles/${id}/`, { method: "PATCH", body: fd });
    if (res.ok) { setEdit(false); load(); }
  }
  async function removeBattle() {
    if (!confirm("Удалить баттл навсегда?")) return;
    const res = await api(`/battles/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) router.push("/battles");
  }

  const entries = b.entries || [];

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div style={{ height: 200, borderRadius: 18, margin: "16px 0 0", backgroundSize: "cover", backgroundPosition: "center",
        backgroundImage: `url('${b.cover || PH_COVER}')` }} />
      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 11, color: b.status === "voting" ? "var(--green)" : "var(--ink-dim)",
          border: "1px solid var(--line)", borderRadius: 20, padding: "2px 9px" }}>{b.status_display}</span>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 26, margin: "10px 0 2px" }}>{b.title}</h1>
        {b.theme && <div style={{ fontSize: 13, color: "var(--accent-2)" }}>{b.theme}</div>}
        <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 4 }}>
          {b.entries_count} участн.{b.starts_at ? ` · ${new Date(b.starts_at).toLocaleDateString("ru-RU")}` : ""}{b.ends_at ? ` – ${new Date(b.ends_at).toLocaleDateString("ru-RU")}` : ""}
        </div>
        {b.description && <p style={{ whiteSpace: "pre-wrap", marginTop: 12, maxWidth: 720 }}>{b.description}</p>}
      </div>

      {/* Заявка своим образом */}
      {b.can_enter && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginTop: 18, maxWidth: 560 }}>
          {b.my_entry ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "var(--green)" }}>✓ Ваш образ участвует</span>
              <button className="btn btn-ghost btn-sm" onClick={unenter}>Снять заявку</button>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, color: "var(--ink-dim)", display: "block", marginBottom: 8 }}>Заявить свой образ в баттл</label>
              {myLooks.length > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select value={pickLook} onChange={(e) => setPickLook(e.target.value)} style={{ flex: "1 1 200px" }}>
                    <option value="">— выбрать образ —</option>
                    {myLooks.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={enter} disabled={!pickLook}>Участвовать</button>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0 }}>Нет своих образов. <a href="/cabinet?tab=roles">Добавьте образ в кабинете</a>.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Лидерборд / участники */}
      <h2 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 20, margin: "26px 0 12px" }}>
        {b.status === "finished" ? "Итоги" : "Участники"}
      </h2>
      {entries.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--ink-dim)" }}>Пока нет заявок. Будьте первым!</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
          {entries.map((e: any, i: number) => (
            <div key={e.id} style={{ background: "var(--bg-2)", border: e.is_mine_vote ? "1px solid var(--accent)" : "1px solid var(--line)", borderRadius: 14, overflow: "hidden", position: "relative" }}>
              {i < 3 && b.status === "finished" && (
                <span style={{ position: "absolute", top: 8, left: 8, fontSize: 18 }}>{["🥇", "🥈", "🥉"][i]}</span>
              )}
              <a href={e.look_id ? `/looks` : "#"}>
                <div style={{ aspectRatio: "3/4", backgroundSize: "cover", backgroundPosition: "center",
                  backgroundImage: `url('${e.image || PH_LOOK}')` }} />
              </a>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8 }}>
                  {e.author_profile_id ? <a href={`/people/${e.author_profile_id}`}>@{e.author_name}</a> : `@${e.author_name}`}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>♥ {e.votes_count}</span>
                  {b.can_vote && (
                    <button onClick={() => vote(e.id, e.is_mine_vote)} className={e.is_mine_vote ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                      style={{ padding: "4px 10px", fontSize: 12 }}>
                      {e.is_mine_vote ? "✓ Мой голос" : "Голосовать"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Управление создателя */}
      {b.is_creator && (
        <div className="about" style={{ marginTop: 24, border: "1px solid rgba(255,210,74,.25)", maxWidth: 560 }}>
          <h3 style={{ color: "var(--accent-3)" }}>Управление</h3>
          {!edit ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>Редактировать</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={removeBattle}>Удалить</button>
            </div>
          ) : (
            <div>
              <div className="field"><label>Название</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="field"><label>Тема</label><input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
              <div className="field"><label>Описание</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <div className="field"><label>Старт</label><input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} style={{ colorScheme: "dark" }} /></div>
                <div className="field"><label>Конец</label><input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} style={{ colorScheme: "dark" }} /></div>
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
  );
}
