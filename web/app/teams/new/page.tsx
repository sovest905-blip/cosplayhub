"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTeamPage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [f, setF] = useState({ name: "", city: "", about: "", instagram: "", tiktok: "", contact: "", is_open: true });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login?next=/teams/new"); return; } setOk(true); })
      .catch(() => router.replace("/auth/login?next=/teams/new"));
  }, [router]);

  async function submit() {
    if (!f.name.trim()) { setErr("Введите название"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("name", f.name); fd.append("city", f.city); fd.append("about", f.about);
      fd.append("instagram", f.instagram); fd.append("tiktok", f.tiktok); fd.append("contact", f.contact);
      fd.append("is_open", f.is_open ? "true" : "false");
      if (avatar) fd.append("avatar", avatar);
      if (cover) fd.append("cover", cover);
      const res = await fetch("/api/v1/teams/", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.name?.[0] || "Не удалось");
      router.push(`/teams/${data.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 720 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/teams">Команды</a><span className="sep">›</span><span className="cur">Новая команда</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "8px 0 20px" }}>Создать команду</h1>

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Название</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Team Mondstadt" /></div>
          <div className="field"><label>Город</label><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Алматы" /></div>
        </div>
        <div className="field"><label>Описание</label><textarea rows={4} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} placeholder="О чём команда, какие вселенные…" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Instagram</label><input value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="@team" /></div>
          <div className="field"><label>TikTok</label><input value={f.tiktok} onChange={(e) => setF({ ...f, tiktok: e.target.value })} placeholder="@team" /></div>
          <div className="field"><label>Контакт для связи</label><input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="@captain / телефон" /></div>
          <div className="field"><label>Лого</label><input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} /></div>
          <div className="field"><label>Обложка</label><input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></div>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>
          <input type="checkbox" checked={f.is_open} onChange={(e) => setF({ ...f, is_open: e.target.checked })} style={{ width: "auto" }} />
          Открытый набор (вступают без заявки)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Создаём…" : "Создать команду"}</button>
          <a href="/teams" className="btn btn-ghost">Отмена</a>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}
