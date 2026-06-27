"use client";
import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { COSTUME_STATUS_RU, RENTAL_STATUS_RU } from "../../../lib/api";
import { fmtPrice } from "../../../lib/pricing";

const PH = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&q=80";

async function api(path: string, opts: RequestInit = {}) {
  return fetch(`/api/v1${path}`, { credentials: "include", ...opts });
}
const json = (body: any) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function CostumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [c, setC] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [req, setReq] = useState({ date_from: "", date_to: "", comment: "" });
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  function load() {
    api(`/costumes/${id}/`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { setNotFound(true); return; }
      setC(d);
      setForm({ title: d.title, character: d.character, city: d.city, size: d.size,
        price_day: d.price_day ?? "", deposit: d.deposit ?? "", description: d.description, status: d.status });
    });
  }
  useEffect(load, [id]);

  if (notFound) return <div className="wrap" style={{ padding: 48 }}><h1>Костюм не найден</h1><a href="/rent" className="btn btn-ghost">← К прокату</a></div>;
  if (!c) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  const isOwner = c.is_owner;

  async function gated(fn: () => Promise<void>) {
    const me = await api("/auth/me/");
    if (!me.ok) { router.push(`/auth/login?next=/rent/${id}`); return; }
    await fn();
  }
  const apply = () => gated(async () => { await api(`/costumes/${id}/request/`, json(req)); load(); });
  const cancelReq = () => gated(async () => { await api(`/costumes/${id}/request/`, { method: "DELETE" }); load(); });
  async function decide(reqId: number, status: string) {
    await api(`/rentals/${reqId}/`, json({ status })); load();
  }
  async function saveEdit() {
    const fd = new FormData();
    ["title", "character", "city", "size", "description", "status"].forEach((k) => fd.append(k, form[k] ?? ""));
    if (String(form.price_day).trim()) fd.append("price_day", String(form.price_day).replace(/\D/g, ""));
    if (String(form.deposit).trim()) fd.append("deposit", String(form.deposit).replace(/\D/g, ""));
    const res = await api(`/costumes/${id}/`, { method: "PATCH", body: fd });
    if (res.ok) { setEdit(false); load(); }
  }
  async function removeCostume() {
    if (!confirm("Удалить костюм навсегда?")) return;
    const res = await api(`/costumes/${id}/`, { method: "DELETE" });
    if (res.ok || res.status === 204) router.push("/rent");
  }

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="crumbs" style={{ paddingTop: 16 }}>
        <a href="/">Главная</a><span className="sep">›</span><a href="/rent">Прокат</a><span className="sep">›</span><span className="cur">{c.title}</span>
      </div>

      <div className="profile-grid" style={{ marginTop: 16 }}>
        <div>
          <div style={{ aspectRatio: "3/4", maxWidth: 420, borderRadius: 16, backgroundSize: "cover", backgroundPosition: "center",
            backgroundImage: `url('${c.image || PH}')` }} />
        </div>

        <div>
          <span style={{ fontSize: 11, color: c.status === "available" ? "var(--green)" : "var(--ink-dim)",
            border: "1px solid var(--line)", borderRadius: 20, padding: "2px 9px" }}>{c.status_display}</span>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 26, margin: "10px 0 2px" }}>{c.title}</h1>
          {c.character && <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>{c.character}</div>}

          <div style={{ fontSize: 22, fontWeight: 800, margin: "14px 0 4px" }}>
            {c.price_day != null ? `${fmtPrice(c.price_day)}/сутки` : "Цена договорная"}
          </div>
          {c.deposit != null && <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>Залог: {fmtPrice(c.deposit)}</div>}
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 6 }}>
            📍 {c.city || "—"}{c.size ? ` · размер ${c.size}` : ""} · владелец{" "}
            {c.owner_profile_id ? <a href={`/people/${c.owner_profile_id}`}>@{c.owner_name}</a> : `@${c.owner_name}`}
          </div>

          {c.description && <p style={{ whiteSpace: "pre-wrap", marginTop: 14 }}>{c.description}</p>}

          {/* Действие арендатора */}
          {!isOwner && (
            <div style={{ marginTop: 16 }}>
              {c.my_request === "pending" ? (
                <button onClick={cancelReq} className="btn btn-ghost">Заявка отправлена · отозвать</button>
              ) : c.my_request === "approved" ? (
                <span style={{ color: "var(--green)", fontSize: 14 }}>✓ Аренда подтверждена — свяжитесь с владельцем</span>
              ) : c.status !== "available" ? (
                <span style={{ color: "var(--ink-dim)", fontSize: 14 }}>Сейчас недоступен для аренды</span>
              ) : (
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, maxWidth: 420 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                    <div className="field"><label>С</label><input type="date" value={req.date_from} onChange={(e) => setReq({ ...req, date_from: e.target.value })} style={{ colorScheme: "dark" }} /></div>
                    <div className="field"><label>По</label><input type="date" value={req.date_to} onChange={(e) => setReq({ ...req, date_to: e.target.value })} style={{ colorScheme: "dark" }} /></div>
                  </div>
                  <div className="field"><label>Комментарий</label><input value={req.comment} onChange={(e) => setReq({ ...req, comment: e.target.value })} placeholder="На какое событие, вопросы…" /></div>
                  <button onClick={apply} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Запросить аренду</button>
                </div>
              )}
            </div>
          )}

          {/* Панель владельца */}
          {isOwner && (
            <div className="about" style={{ marginTop: 18, border: "1px solid rgba(255,210,74,.25)" }}>
              <h3 style={{ color: "var(--accent-3)" }}>Управление</h3>

              {c.requests?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 }}>Заявки на аренду ({c.requests.length})</div>
                  {c.requests.map((r: any) => (
                    <div key={r.id} className="info-row" style={{ alignItems: "center" }}>
                      <a href={r.profile_id ? `/people/${r.profile_id}` : "#"} style={{ fontSize: 13 }}>
                        @{r.username}
                        {(r.date_from || r.date_to) && <span style={{ color: "var(--ink-dim)" }}> · {r.date_from || "?"}–{r.date_to || "?"}</span>}
                        <span style={{ color: "var(--ink-dim)" }}> · {RENTAL_STATUS_RU[r.status] || r.status}</span>
                      </a>
                      {r.status === "pending" && (
                        <span style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-primary btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => decide(r.id, "approved")}>принять</button>
                          <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => decide(r.id, "declined")}>откл.</button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!edit ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>Редактировать</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={removeCostume}>Удалить</button>
                </div>
              ) : (
                <div>
                  <div className="field"><label>Название</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                    <div className="field"><label>Город</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                    <div className="field"><label>Размер</label><input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>
                    <div className="field"><label>Цена/сутки</label><input value={form.price_day} onChange={(e) => setForm({ ...form, price_day: e.target.value })} inputMode="numeric" /></div>
                    <div className="field"><label>Залог</label><input value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} inputMode="numeric" /></div>
                  </div>
                  <div className="field"><label>Описание</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="field"><label>Статус</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {Object.entries(COSTUME_STATUS_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
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
      </div>
    </div>
  );
}
