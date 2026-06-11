"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGuidePage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [f, setF] = useState({ title: "", category: "", summary: "", body: "" });
  const [cover, setCover] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);  // до 5 фото, вставляются в текст маркером [фото:N]
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login?next=/guides/new"); return; } setOk(true); })
      .catch(() => router.replace("/auth/login?next=/guides/new"));
  }, [router]);

  async function submit() {
    if (!f.title.trim()) { setErr("Введите заголовок"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", f.title); fd.append("category", f.category);
      fd.append("summary", f.summary); fd.append("body", f.body);
      if (cover) fd.append("cover", cover);
      const res = await fetch("/api/v1/guides/", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.title?.[0] || data.cover?.[0] || "Не удалось");
      // Фото грузим после создания гайда — по порядку, чтобы номера [фото:N] совпали
      for (const file of photos) {
        const pfd = new FormData();
        pfd.append("image", file);
        await fetch(`/api/v1/guides/${data.id}/photos/`, { method: "POST", credentials: "include", body: pfd });
      }
      router.push(`/guides/${data.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 760 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/guides">Гайды</a><span className="sep">›</span><span className="cur">Новый гайд</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "8px 0 20px" }}>Написать гайд</h1>

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Заголовок</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Как покрасить EVA без трещин" /></div>
          <div className="field"><label>Категория</label><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="EVA / Парики / Грим…" /></div>
        </div>
        <div className="field"><label>Кратко (анонс)</label><input value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="О чём гайд в одну строку" /></div>
        <div className="field"><label>Текст</label><textarea rows={12} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Полный текст гайда…" /></div>
        <div className="field"><label>Обложка (необязательно)</label><input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></div>
        <div className="field">
          <label>Фото к гайду (до 5)</label>
          <input type="file" accept="image/*" multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setPhotos((prev) => [...prev, ...files].slice(0, 5));
              e.target.value = "";
            }} />
          {photos.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span style={{ color: "var(--accent-2)", fontFamily: "var(--font-mono),monospace" }}>[фото:{i + 1}]</span>
                  <span style={{ color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, body: f.body + (f.body.endsWith("\n") || !f.body ? "" : "\n") + `[фото:${i + 1}]\n` })}>
                    Вставить в текст
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <small style={{ color: "var(--ink-dim)" }}>
                Поставь маркер [фото:N] в нужном месте текста — там и появится картинка. Фото без маркера покажутся в конце гайда.
              </small>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Публикуем…" : "Опубликовать"}</button>
          <a href="/guides" className="btn btn-ghost">Отмена</a>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}
