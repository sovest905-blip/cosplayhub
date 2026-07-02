"use client";
import { useState } from "react";
import { createPortal } from "react-dom";

// Донат на поддержку платформы (через Cryptomus, деньги идут проекту t50.team).
// Пресеты в ₸ — совпадают с валютой инвойса по умолчанию (PAY_CURRENCY=KZT).
const PRESETS = [500, 1000, 2000, 5000];

export default function SiteDonate() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);

  async function pay() {
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      const r = await fetch("/api/v1/billing/pay/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ purpose: "donate_site", amount }),
      });
      if (r.status === 503) { alert("Крипто-оплата пока не подключена. Загляните позже."); return; }
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) window.location.href = d.url;
      else alert(d.detail || "Не удалось создать платёж");
    } catch {
      alert("Сеть недоступна, попробуйте позже");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
          color: "var(--ink-dim)", font: "inherit", textAlign: "left" }}>
        💜 Поддержать проект
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: "24px 26px", width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display),sans-serif" }}>Поддержать КосплейХаб</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--ink-dim)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 16px" }}>
              Донат криптой на развитие платформы. Спасибо, что помогаешь проекту жить 🙌
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {PRESETS.map((v) => {
                const on = v === amount;
                return (
                  <button key={v} onClick={() => setAmount(v)}
                    style={{ fontSize: 13, padding: "8px 16px", borderRadius: 20, cursor: "pointer",
                      border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                      background: on ? "rgba(255,45,111,.12)" : "transparent",
                      color: on ? "var(--accent)" : "var(--ink)" }}>
                    {v.toLocaleString("ru-RU")} ₸
                  </button>
                );
              })}
            </div>

            <input type="number" min={1} value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Своя сумма, ₸"
              style={{ marginBottom: 14 }} />

            <button onClick={pay} disabled={loading || !amount || amount <= 0}
              className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "..." : `Поддержать · ${Number(amount || 0).toLocaleString("ru-RU")} ₸`}
            </button>
            <p style={{ fontSize: 11, color: "var(--ink-dim)", textAlign: "center", margin: "10px 0 0" }}>
              USDT · TON · BTC и др. Оплата в крипте через Cryptomus.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
