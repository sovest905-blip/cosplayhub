"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SHOOT_ROLES } from "../../../lib/api";

export default function NewShootPage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [f, setF] = useState({ title: "", city: "", date: "", description: "" });
  const [roles, setRoles] = useState<string[]>(["cosplayer", "photographer"]);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login?next=/shoots/new"); return; } setOk(true); })
      .catch(() => router.replace("/auth/login?next=/shoots/new"));
  }, [router]);

  function toggleRole(key: string) {
    setRoles((prev) => prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]);
  }

  async function submit() {
    if (!f.title.trim()) { setErr("Введите название"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", f.title); fd.append("city", f.city);
      if (f.date) fd.append("date", f.date);
      fd.append("description", f.description);
      roles.forEach((r) => fd.append("looking_for", r));
      if (cover) fd.append("cover", cover);
      const res = await fetch("/api/v1/shoots/", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.title?.[0] || "Не удалось");
      router.push(`/shoots/${data.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 720 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/shoots">Съёмки</a><span className="sep">›</span><span className="cur">Новая съёмка</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "8px 0 4px" }}>Собрать команду</h1>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 20px" }}>
        Опишите задумку и отметьте, кого ищете. Участники откликнутся — вы подтвердите команду.
      </p>

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Название</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Genshin на закате" /></div>
          <div className="field"><label>Город</label><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Алматы" /></div>
        </div>
        <div className="field"><label>Дата (опц.)</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={{ colorScheme: "dark" }} /></div>
        <div className="field"><label>Описание</label><textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Идея, образы, референсы, что нужно от участников…" /></div>

        <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 8 }}>Кого ищем в команду</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {SHOOT_ROLES.map((r) => {
            const on = roles.includes(r.key);
            return (
              <button key={r.key} type="button" onClick={() => toggleRole(r.key)}
                style={{ fontSize: 13, padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  background: on ? "rgba(255,45,111,.12)" : "transparent",
                  color: on ? "var(--accent)" : "var(--ink-dim)" }}>
                {on ? "✓ " : ""}{r.label}
              </button>
            );
          })}
        </div>

        <div className="field"><label>Обложка (опц.)</label><input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Создаём…" : "Создать съёмку"}</button>
          <a href="/shoots" className="btn btn-ghost">Отмена</a>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}
