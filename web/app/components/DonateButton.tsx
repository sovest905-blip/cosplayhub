"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { DONATION_KIND_META } from "../../lib/api";

type Method = { kind: string; address: string };

export default function DonateButton({ methods, name }: { methods: Method[]; name: string }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!methods || methods.length === 0) return null;
  const m = methods[Math.min(sel, methods.length - 1)];
  const meta = DONATION_KIND_META[m.kind] || { label: m.kind, network: "" };

  function copy() {
    navigator.clipboard?.writeText(m.address).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
        💜 Поддержать криптой
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: "24px 26px", width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display),sans-serif" }}>Поддержать {name}</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--ink-dim)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 16px" }}>
              Перевод напрямую косплееру — платформа не берёт комиссию и не хранит средства.
            </p>

            {methods.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {methods.map((x, i) => {
                  const me = DONATION_KIND_META[x.kind] || { label: x.kind };
                  const on = i === sel;
                  return (
                    <button key={i} onClick={() => setSel(i)}
                      style={{ fontSize: 13, padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                        border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                        background: on ? "rgba(255,45,111,.12)" : "transparent", color: on ? "var(--accent)" : "var(--ink-dim)" }}>{me.label}</button>
                  );
                })}
              </div>
            )}

            <div style={{ background: "#fff", padding: 14, borderRadius: 12, width: "fit-content", margin: "0 auto 14px" }}>
              <QRCodeSVG value={m.address} size={168} />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{meta.label} <span style={{ color: "var(--accent-3)", fontWeight: 600 }}>· {meta.network}</span></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code style={{ flex: 1, fontSize: 12, wordBreak: "break-all", background: "var(--bg-3)", padding: "8px 10px", borderRadius: 8 }}>{m.address}</code>
              <button onClick={copy} className="btn btn-ghost btn-sm">{copied ? "✓" : "Копировать"}</button>
            </div>
            <p style={{ fontSize: 11, color: "var(--accent-3)", margin: "12px 0 0" }}>
              ⚠ Отправляйте только в сети <b>{meta.network}</b> — перевод в другой сети будет потерян.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
