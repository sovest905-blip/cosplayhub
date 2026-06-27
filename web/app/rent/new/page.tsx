"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCostumePage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [f, setF] = useState({ title: "", character: "", city: "", size: "", price_day: "", deposit: "", description: "" });
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login?next=/rent/new"); return; } setOk(true); })
      .catch(() => router.replace("/auth/login?next=/rent/new"));
  }, [router]);

  async function submit() {
    if (!f.title.trim()) { setErr("Введите название"); return; }
    if (image && image.size > 5 * 1024 * 1024) { setErr("Фото максимум 5 МБ"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", f.title); fd.append("character", f.character);
      fd.append("city", f.city); fd.append("size", f.size); fd.append("description", f.description);
      // пустую цену НЕ слать — DRF IntegerField падает на "" (грабля как у товаров)
      if (f.price_day.trim()) fd.append("price_day", f.price_day.replace(/\D/g, ""));
      if (f.deposit.trim()) fd.append("deposit", f.deposit.replace(/\D/g, ""));
      if (image) fd.append("image", image);
      const res = await fetch("/api/v1/costumes/", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.title?.[0] || "Не удалось");
      router.push(`/rent/${data.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 720 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/rent">Прокат</a><span className="sep">›</span><span className="cur">Сдать костюм</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "8px 0 4px" }}>Сдать костюм напрокат</h1>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 20px" }}>
        Оплата и залог — напрямую с арендатором. Платформа сейчас только сводит вас (комиссия появится после запуска оплат).
      </p>

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Название</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Костюм Райдэн Сёгун" /></div>
          <div className="field"><label>Город</label><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Алматы" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Персонаж / фандом</label><input value={f.character} onChange={(e) => setF({ ...f, character: e.target.value })} placeholder="Genshin Impact" /></div>
          <div className="field"><label>Размер</label><input value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} placeholder="M / 42-44 / рост 165" /></div>
          <div className="field"><label>Цена/сутки, ₸ (пусто = договорная)</label><input value={f.price_day} onChange={(e) => setF({ ...f, price_day: e.target.value })} placeholder="5000" inputMode="numeric" /></div>
          <div className="field"><label>Залог, ₸ (опц.)</label><input value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value })} placeholder="15000" inputMode="numeric" /></div>
        </div>
        <div className="field"><label>Описание</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Что входит (парик, обувь, реквизит), состояние, условия…" /></div>
        <div className="field"><label>Фото костюма</label><input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Сохраняем…" : "Выставить на прокат"}</button>
          <a href="/rent" className="btn btn-ghost">Отмена</a>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}
