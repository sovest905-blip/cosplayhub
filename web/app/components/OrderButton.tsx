"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function OrderButton({
  workshopId,
  label = "Заказать",
  className = "btn btn-primary",
  fullWidth = false,
}: {
  workshopId: number;
  label?: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function openForm() {
    const r = await fetch("/api/v1/auth/me/", { credentials: "include" });
    if (!r.ok) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/v1/orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workshop: workshopId,
          description: desc,
          budget: budget ? Number(budget.replace(/\D/g, "")) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.description?.[0] || data.detail || "Не удалось отправить заявку");
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const btnStyle = fullWidth ? { width: "100%", justifyContent: "center" as const } : undefined;

  return (
    <>
      <button className={className} style={btnStyle} onClick={openForm}>{label}</button>

      {open && (
        <div
          onClick={() => !loading && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 440 }}
          >
            {done ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Заявка отправлена</h3>
                <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "0 0 18px" }}>
                  Мастерская получит её. Статус — в кабинете → «Мои заказы».
                </p>
                <a href="/cabinet?tab=orders" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Мои заказы →
                </a>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>Заявка в мастерскую</h3>
                <div className="field">
                  <label>Что нужно сделать?</label>
                  <textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} required
                    placeholder="Опиши заказ: персонаж, детали, материалы, сроки..." />
                </div>
                <div className="field">
                  <label>Бюджет, ₸ (необязательно)</label>
                  <input type="text" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="напр. 50000" />
                </div>
                {error && (
                  <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>{error}</div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>Отмена</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={loading || !desc.trim()}>
                    {loading ? "Отправляем..." : "Отправить заявку →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
