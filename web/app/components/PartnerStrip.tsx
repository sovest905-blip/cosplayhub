"use client";

import { useEffect, useState } from "react";
import { getPartners, type Partner } from "../../lib/api";

/** Лого-полоса «Партнёры» над футером. Генеральный — цветной, остальные приглушены
 *  и оживают при наведении. Если партнёров-полосы нет — ничего не рисуем. */
export default function PartnerStrip({ variant = "footer" }: { variant?: "footer" | "top" }) {
  const [items, setItems] = useState<Partner[]>([]);
  useEffect(() => {
    getPartners().then((list) => setItems(list.filter((p) => p.show_strip))).catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const wrapStyle = variant === "top"
    ? { border: "1px solid var(--line)", borderRadius: 16, background: "var(--bg-2)", padding: "18px 20px", margin: "8px 0 4px" }
    : { borderTop: "1px solid var(--line)", padding: "22px 0 8px" };

  return (
    <div style={wrapStyle}>
      <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-dim)", textAlign: "center", marginBottom: 16 }}>
        ПАРТНЁРЫ
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center", alignItems: "center" }}>
        {items.map((p) => {
          const general = p.tier === "general";
          return (
            <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer sponsored"
              title={p.name}
              className="partner-logo"
              style={{ display: "inline-flex", alignItems: "center", opacity: general ? 1 : 0.55 }}>
              {p.logo
                ? <img src={p.logo} alt={p.name} style={{ maxHeight: 30, maxWidth: 150, objectFit: "contain",
                    filter: general ? "none" : "grayscale(1)" }} />
                : <span style={{ fontWeight: 700, fontSize: 16, color: general ? "var(--ink)" : "var(--ink-dim)" }}>{p.name}</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}
