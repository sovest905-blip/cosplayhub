"use client";
import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { LOOK_STAGE_RU } from "../../../lib/api";

const PH = "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=700&q=80";

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}

const STAGE_COLOR: Record<string, string> = {
  planned: "var(--accent-2)", wip: "var(--accent-3)", done: "var(--green)",
};

export default function LookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [l, setL] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [myWs, setMyWs] = useState<any[]>([]);
  const [upd, setUpd] = useState({ text: "", workshop: "" });
  const [img, setImg] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api(`/looks/${id}/`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { setNotFound(true); return; }
      setL(d);
    });
  }
  useEffect(load, [id]);
  // свои мастерские — для связки «заказал тут» (только автору)
  useEffect(() => {
    if (l?.is_mine) api(`/workshops/mine/`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const x = d?.results ?? d; if (Array.isArray(x)) setMyWs(x);
    });
  }, [l?.is_mine]);

  if (notFound) return <div className="wrap" style={{ padding: 48 }}><h1>Образ не найден</h1><a href="/looks" className="btn btn-ghost">← К образам</a></div>;
  if (!l) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  async function setStage(stage: string) {
    const res = await api(`/looks/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    if (res.ok) load();
  }
  async function addUpdate() {
    if (!upd.text.trim() && !img) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("text", upd.text);
      if (upd.workshop) fd.append("workshop", upd.workshop);
      if (img) fd.append("image", img);
      const res = await api(`/looks/${id}/updates/`, { method: "POST", body: fd });
      if (res.ok) { setUpd({ text: "", workshop: "" }); setImg(null); load(); }
      else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
    } finally { setBusy(false); }
  }
  async function delUpdate(uid: number) {
    await api(`/looks/${id}/updates/${uid}/`, { method: "DELETE" }); load();
  }
  async function removeLook() {
    if (!confirm("Удалить образ?")) return;
    const res = await api(`/looks/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) router.push("/looks");
  }
  async function toggleBoost() {
    const res = await api(`/looks/${id}/boost/`, { method: l.is_boosted ? "DELETE" : "POST" });
    if (res.ok) load();
    else { const e = await res.json().catch(() => ({})); alert(e.detail || "Не удалось"); }
  }

  const updates = l.updates || [];

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="crumbs" style={{ paddingTop: 16 }}>
        <a href="/">Главная</a><span className="sep">›</span><a href="/looks">Образы</a><span className="sep">›</span><span className="cur">{l.title}</span>
      </div>

      <div className="profile-grid" style={{ marginTop: 16 }}>
        <div>
          <div style={{ aspectRatio: "3/4", maxWidth: 420, borderRadius: 16, backgroundSize: "cover", backgroundPosition: "center",
            backgroundImage: `url('${l.image || PH}')` }} />
        </div>

        <div>
          <span style={{ fontSize: 11, color: STAGE_COLOR[l.stage] || "var(--ink-dim)",
            border: "1px solid var(--line)", borderRadius: 20, padding: "2px 9px" }}>{l.stage_display}</span>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 26, margin: "10px 0 2px" }}>{l.title}</h1>
          {l.character && <div style={{ fontSize: 13, color: "var(--accent-2)" }}>{l.character}</div>}
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 6 }}>
            ♥ {l.likes_count} · автор{" "}
            {l.author_profile_id ? <a href={`/people/${l.author_profile_id}`}>@{l.author_name}</a> : `@${l.author_name}`}
          </div>
          {l.description && <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{l.description}</p>}

          {/* Управление автора: стадия */}
          {l.is_mine && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 }}>Стадия работы</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(LOOK_STAGE_RU).map(([k, v]) => (
                  <button key={k} onClick={() => setStage(k)}
                    className={l.stage === k ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>{v}</button>
                ))}
                <button onClick={removeLook} className="btn btn-ghost btn-sm" style={{ color: "var(--red)", marginLeft: "auto" }}>Удалить образ</button>
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={toggleBoost} className={l.is_boosted ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>
                  {l.is_boosted ? "✦ Продвигается в ленте · снять" : "✦ Продвинуть в ленте (Pro)"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Лента прогресса */}
      <h2 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 20, margin: "26px 0 12px" }}>Прогресс работы</h2>

      {l.is_mine && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 18, maxWidth: 640 }}>
          <div className="field"><label>Что сделано на этом этапе</label>
            <textarea rows={2} value={upd.text} onChange={(e) => setUpd({ ...upd, text: e.target.value })} placeholder="Сшил основу, покрасил броню, заказал парик…" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <div className="field"><label>Фото этапа (опц.)</label><input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] || null)} /></div>
            {myWs.length > 0 && (
              <div className="field"><label>Заказал в мастерской (опц.)</label>
                <select value={upd.workshop} onChange={(e) => setUpd({ ...upd, workshop: e.target.value })}>
                  <option value="">— нет —</option>
                  {myWs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={addUpdate} disabled={busy}>{busy ? "Сохраняем…" : "+ Добавить этап"}</button>
        </div>
      )}

      {updates.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--ink-dim)" }}>Этапов пока нет.{l.is_mine && " Расскажите, как идёт работа над образом."}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
          {updates.map((u: any) => (
            <div key={u.id} style={{ display: "flex", gap: 12, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
              {u.image && <div style={{ width: 88, height: 88, flexShrink: 0, borderRadius: 8, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${u.image}')` }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{new Date(u.created_at).toLocaleDateString("ru-RU")}</div>
                {u.text && <p style={{ margin: "4px 0", whiteSpace: "pre-wrap", fontSize: 14 }}>{u.text}</p>}
                {u.workshop_name && <a href={`/workshops/${u.workshop}`} style={{ fontSize: 12, color: "var(--accent-2)" }}>⚒ заказал в «{u.workshop_name}»</a>}
              </div>
              {l.is_mine && <button onClick={() => delUpdate(u.id)} title="Удалить" style={{ background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: 18, alignSelf: "flex-start" }}>×</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
