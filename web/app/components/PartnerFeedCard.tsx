"use client";

import { useEffect, useState } from "react";
import { getPartners, type Partner } from "../../lib/api";

/** Нативная карточка партнёра в ленте (помечена «Партнёр»). Показываем партнёров с show_feed. */
export default function PartnerFeedCard() {
  const [items, setItems] = useState<Partner[]>([]);
  useEffect(() => {
    getPartners().then((list) => setItems(list.filter((p) => p.show_feed))).catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16, marginBottom: 20 }}>
      {items.map((p) => (
        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer sponsored"
          style={{ position: "relative", display: "flex", flexDirection: "column",
            background: "var(--bg-2)", border: "1px solid rgba(157,124,255,.3)", borderRadius: 16, overflow: "hidden" }}>
          <span style={{ position: "absolute", top: 8, left: 8, zIndex: 2, fontSize: 9, letterSpacing: ".05em",
            color: "var(--accent-2)", background: "rgba(0,0,0,.5)", borderRadius: 20, padding: "2px 8px" }}>ПАРТНЁР</span>
          <div style={{ aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#17171d,#0c0c10)" }}>
            {p.logo
              ? <img src={p.logo} alt={p.name} style={{ maxHeight: "60%", maxWidth: "70%", objectFit: "contain" }} />
              : <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1, color: "#fff" }}>{p.name}</span>}
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 14, color: "var(--ink)" }}>{p.card_text || p.name}</div>
            <div style={{ fontSize: 12, color: "var(--accent-2)", marginTop: 4 }}>Перейти →</div>
          </div>
        </a>
      ))}
    </div>
  );
}
