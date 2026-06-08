"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewMoodboardPage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [f, setF] = useState({ title: "", description: "", is_public: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login?next=/moodboards/new"); return; } setOk(true); })
      .catch(() => router.replace("/auth/login?next=/moodboards/new"));
  }, [router]);

  async function submit() {
    if (!f.title.trim()) { setErr("Введите название"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch("/api/v1/moodboards/", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.title?.[0] || "Не удалось");
      router.push(`/moodboards/${data.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 640 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/moodboards">Доски</a><span className="sep">›</span><span className="cur">Новая доска</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "8px 0 20px" }}>Создать доску</h1>

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div className="field"><label>Название</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Референсы: киберпанк" /></div>
        <div className="field"><label>Описание</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Для чего эта доска…" /></div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>
          <input type="checkbox" checked={f.is_public} onChange={(e) => setF({ ...f, is_public: e.target.checked })} style={{ width: "auto" }} />
          Публичная (видна в каталоге)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Создаём…" : "Создать доску"}</button>
          <a href="/moodboards" className="btn btn-ghost">Отмена</a>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}
