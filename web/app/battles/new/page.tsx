"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBattlePage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [f, setF] = useState({ title: "", theme: "", description: "", starts_at: "", ends_at: "" });
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login?next=/battles/new"); return; } setOk(true); })
      .catch(() => router.replace("/auth/login?next=/battles/new"));
  }, [router]);

  async function submit() {
    if (!f.title.trim()) { setErr("Введите название"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", f.title); fd.append("theme", f.theme); fd.append("description", f.description);
      if (f.starts_at) fd.append("starts_at", f.starts_at);
      if (f.ends_at) fd.append("ends_at", f.ends_at);
      if (cover) fd.append("cover", cover);
      const res = await fetch("/api/v1/battles/", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.title?.[0] || "Не удалось");
      router.push(`/battles/${data.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 720 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/battles">Баттлы</a><span className="sep">›</span><span className="cur">Новый баттл</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "8px 0 4px" }}>Создать баттл</h1>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 20px" }}>
        Задайте тему и окно голосования. Участники заявят свои образы, остальные проголосуют.
      </p>

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Название</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Лучший Genshin-косплей" /></div>
          <div className="field"><label>Тема</label><input value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })} placeholder="Аниме / Genshin" /></div>
        </div>
        <div className="field"><label>Описание</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Правила, критерии, призы…" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Старт голосования (опц.)</label><input type="date" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} style={{ colorScheme: "dark" }} /></div>
          <div className="field"><label>Конец голосования (опц.)</label><input type="date" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} style={{ colorScheme: "dark" }} /></div>
        </div>
        <div className="field"><label>Обложка (опц.)</label><input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Создаём…" : "Создать баттл"}</button>
          <a href="/battles" className="btn btn-ghost">Отмена</a>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}
