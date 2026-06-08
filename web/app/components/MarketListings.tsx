"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicListing } from "../../lib/api";

// Витрина барахолки: карточки кликабельны — открывается модалка с деталями,
// кнопкой «Написать в чат» (ведёт в мессенджер с владельцем) и контактами,
// которые продавец указал в объявлении.
export default function MarketListings({ items }: { items: PublicListing[] }) {
  const router = useRouter();
  const [active, setActive] = useState<PublicListing | null>(null);
  const [writing, setWriting] = useState(false);

  async function writeInChat(l: PublicListing) {
    setWriting(true);
    try {
      const r = await fetch("/api/v1/auth/me/", { credentials: "include" });
      const target = `/cabinet?tab=messages&to=${l.owner_id}&listing=${l.id}`;
      if (r.ok) router.push(target);
      else router.push(`/auth/login?next=${encodeURIComponent(target)}`);
    } catch {
      router.push(`/auth/login?next=${encodeURIComponent(`/cabinet?tab=messages&to=${l.owner_id}&listing=${l.id}`)}`);
    } finally {
      setWriting(false);
    }
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {items.map((l) => (
          <button
            key={l.id}
            onClick={() => setActive(l)}
            style={{
              textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit",
              background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16,
              padding: "16px 18px", transition: "border-color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: l.type === "sell" ? "var(--green)" : "var(--accent-2)" }}>{l.type_display}</span>
              {l.price ? <span style={{ fontSize: 13, fontWeight: 700 }}>{l.price.toLocaleString("ru-RU")} ₸</span> : null}
            </div>
            <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{l.title}</h3>
            {l.description && <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 8px", lineHeight: 1.5 }}>{l.description.slice(0, 120)}{l.description.length > 120 ? "…" : ""}</p>}
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
              📍 {l.city || "—"} ·{" "}
              <span
                role="link"
                tabIndex={0}
                title={`Открыть чат с @${l.owner}`}
                onClick={(e) => { e.stopPropagation(); writeInChat(l); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); writeInChat(l); } }}
                style={{ color: "var(--accent-2)", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >@{l.owner}</span>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          onClick={() => setActive(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.6)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18,
              maxWidth: 460, width: "100%", padding: "22px 24px", position: "relative",
            }}
          >
            <button
              onClick={() => setActive(null)}
              aria-label="Закрыть"
              style={{
                position: "absolute", top: 14, right: 16, background: "none", border: "none",
                color: "var(--ink-dim)", fontSize: 22, cursor: "pointer", lineHeight: 1,
              }}
            >×</button>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10, paddingRight: 24 }}>
              <span style={{ fontSize: 12, color: active.type === "sell" ? "var(--green)" : "var(--accent-2)" }}>{active.type_display}</span>
              {active.price ? <span style={{ fontSize: 18, fontWeight: 700 }}>{active.price.toLocaleString("ru-RU")} ₸</span> : null}
            </div>

            <h2 style={{ fontSize: 20, margin: "0 0 10px", fontFamily: "var(--font-display),sans-serif" }}>{active.title}</h2>
            {active.description && <p style={{ fontSize: 14, color: "var(--ink-dim)", margin: "0 0 14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{active.description}</p>}

            <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 16 }}>
              📍 {active.city || "—"} · автор @{active.owner}
            </div>

            {active.contact && (
              <div style={{
                background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12,
                padding: "10px 14px", marginBottom: 16, fontSize: 13,
              }}>
                <span style={{ color: "var(--ink-dim)" }}>Контакты для связи:</span>
                <div style={{ marginTop: 4, fontWeight: 600, wordBreak: "break-word" }}>{active.contact}</div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={writing}
              onClick={() => writeInChat(active)}
            >
              {writing ? "..." : "✉ Написать в чат"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
