"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type Slot = {
  id: number; title: string; date: string; time_start: string; time_end: string;
  price: number | null; is_booked: boolean; my_booking: string | null; owner_id: number;
};

const MY_STATUS: Record<string, [string, string]> = {
  pending: ["Заявка отправлена", "var(--accent-2)"],
  approved: ["Бронь подтверждена", "var(--green)"],
  declined: ["Заявка отклонена", "var(--ink-dim)"],
};

function fmtD(d: string) {
  try { return new Date(d).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" }); }
  catch { return d; }
}
const fmtT = (t: string) => (t || "").slice(0, 5);

// Слоты аренды на профиле локации: список свободных окон + заявка на бронь.
export default function SlotList({ ownerId }: { ownerId: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [meId, setMeId] = useState<number | null>(null);

  useEffect(() => {
    if (!ownerId) { setLoaded(true); return; }
    fetch(`/api/v1/slots/?owner=${ownerId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const list = d?.results ?? d; if (Array.isArray(list)) setSlots(list); })
      .catch(() => {})
      .finally(() => setLoaded(true));
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me) setMeId(me.id); })
      .catch(() => {});
  }, [ownerId]);

  async function book(slot: Slot) {
    setBusy(slot.id);
    try {
      const me = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (!me.ok) { router.push(`/auth/login?next=${encodeURIComponent(pathname)}`); return; }
      const res = await fetch(`/api/v1/slots/${slot.id}/book/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSlots((p) => p.map((s) => (s.id === slot.id ? { ...s, my_booking: data.my_booking || "pending" } : s)));
      } else alert(data.detail || "Не удалось отправить заявку");
    } finally { setBusy(null); }
  }

  async function cancel(slot: Slot) {
    if (!confirm("Отменить заявку на этот слот?")) return;
    setBusy(slot.id);
    try {
      const res = await fetch(`/api/v1/slots/${slot.id}/book/`, { method: "DELETE", credentials: "include" });
      if (res.ok || res.status === 204) {
        setSlots((p) => p.map((s) => (s.id === slot.id ? { ...s, my_booking: null } : s)));
      }
    } finally { setBusy(null); }
  }

  if (!loaded) return <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>Загрузка…</p>;
  if (slots.length === 0) {
    return <p style={{ color: "var(--ink-dim)", fontSize: 14, margin: 0 }}>Свободных слотов пока нет — напишите локации в сообщения.</p>;
  }

  return (
    <div>
      {slots.map((s) => {
        const mine = s.my_booking ? MY_STATUS[s.my_booking] : null;
        const isOwner = meId !== null && meId === s.owner_id;
        return (
          <div key={s.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
            padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13,
          }}>
            <div>
              <b>{fmtD(s.date)}</b> · {fmtT(s.time_start)}–{fmtT(s.time_end)}
              {s.title && <span style={{ color: "var(--ink-dim)" }}> · {s.title}</span>}
              <div style={{ color: "var(--ink-dim)", fontSize: 12, marginTop: 2 }}>
                {s.price ? `${Number(s.price).toLocaleString("ru-RU")} ₸` : "цена договорная"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {s.is_booked && !mine ? (
                <span style={{ color: "var(--ink-dim)", fontSize: 12 }}>Занят</span>
              ) : mine ? (
                <>
                  <span style={{ color: mine[1], fontSize: 12 }}>{mine[0]}</span>
                  {(s.my_booking === "pending" || s.my_booking === "approved") && (
                    <button className="btn btn-ghost btn-sm" disabled={busy === s.id} onClick={() => cancel(s)}>Отменить</button>
                  )}
                </>
              ) : isOwner ? (
                <a href="/cabinet?tab=roles" className="btn btn-ghost btn-sm">Управлять</a>
              ) : (
                <button className="btn btn-primary btn-sm" disabled={busy === s.id} onClick={() => book(s)}>
                  {busy === s.id ? "…" : "Забронировать"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <p style={{ color: "var(--ink-dim)", fontSize: 11, margin: "10px 0 0" }}>
        Бронь подтверждает владелец локации. Оплата на месте или в личных сообщениях — платежи на площадке появятся позже.
      </p>
    </div>
  );
}
