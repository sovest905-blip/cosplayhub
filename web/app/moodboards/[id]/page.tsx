"use client";
import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";

const PH = "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400&q=80";

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}

export default function MoodboardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [b, setB] = useState<any>(null);
  const [nf, setNf] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  function load() {
    api(`/moodboards/${id}/`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { setNf(true); return; }
      setB(d); setForm({ title: d.title, description: d.description, is_public: d.is_public });
    });
  }
  useEffect(load, [id]);

  if (nf) return <div className="wrap" style={{ padding: 48 }}><h1>Доска не найдена</h1><a href="/moodboards" className="btn btn-ghost">← К доскам</a></div>;
  if (!b) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  async function addItem() {
    setErr("");
    if (!file && !url.trim()) { setErr("Укажите ссылку или выберите файл"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("image", file); else fd.append("image_url", url.trim());
      if (caption.trim()) fd.append("caption", caption.trim());
      const res = await api(`/moodboards/${id}/items/`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setUrl(""); setCaption(""); setFile(null); load(); }
      else setErr(d.detail || "Не удалось");
    } finally { setBusy(false); }
  }
  async function delItem(itemId: number) {
    const res = await api(`/moodboards/${id}/items/${itemId}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) load();
  }
  async function saveEdit() {
    const res = await api(`/moodboards/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setEdit(false); load(); }
  }
  async function removeBoard() {
    if (!confirm("Удалить доску со всеми картинками?")) return;
    const res = await api(`/moodboards/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) router.push("/moodboards");
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/moodboards">Доски</a><span className="sep">›</span><span className="cur">{b.title}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, margin: "8px 0 6px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: 0 }}>{b.title}{!b.is_public && <span style={{ fontSize: 12, color: "var(--ink-dim)", marginLeft: 10 }}>приватная</span>}</h1>
          <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>{b.owner_id ? <a href={`/people/${b.owner_id}`} style={{ color: "var(--accent-2)" }}>@{b.owner_name}</a> : `@${b.owner_name}`} · {b.items.length} картинок</div>
        </div>
        {b.can_edit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit((v) => !v)}>Редактировать</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={removeBoard}>Удалить</button>
          </div>
        )}
      </div>
      {b.description && <p style={{ color: "var(--ink-dim)", fontSize: 14, maxWidth: 640 }}>{b.description}</p>}

      {b.can_edit && edit && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, margin: "12px 0", maxWidth: 520 }}>
          <div className="field"><label>Название</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Описание</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-dim)", marginBottom: 10 }}>
            <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} style={{ width: "auto" }} /> Публичная
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveEdit}>Сохранить</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>Отмена</button>
          </div>
        </div>
      )}

      {b.can_edit && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, margin: "14px 0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 240px", marginBottom: 0 }}><label>Ссылка на картинку</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...jpg" /></div>
          <div className="field" style={{ flex: "0 0 auto", marginBottom: 0 }}><label>или файл</label><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <div className="field" style={{ flex: "1 1 160px", marginBottom: 0 }}><label>Подпись</label><input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="опц." /></div>
          <button className="btn btn-primary btn-sm" onClick={addItem} disabled={busy}>{busy ? "…" : "+ Добавить"}</button>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      )}

      {b.items.length === 0 ? (
        <p style={{ color: "var(--ink-dim)", fontSize: 14, marginTop: 16 }}>На доске пока нет картинок.</p>
      ) : (
        <div style={{ columns: "5 180px", columnGap: 12, marginTop: 8 }}>
          {b.items.map((it: any) => (
            <div key={it.id} style={{ breakInside: "avoid", marginBottom: 12, position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
              <img src={it.url || PH} alt={it.caption || ""} style={{ width: "100%", display: "block" }} />
              {it.caption && <div style={{ fontSize: 11, color: "var(--ink-dim)", padding: "6px 8px" }}>{it.caption}</div>}
              {b.can_edit && (
                <button onClick={() => delItem(it.id)} title="Удалить"
                  style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", border: "none",
                    background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
