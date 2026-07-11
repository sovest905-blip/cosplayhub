import type { CSSProperties } from "react";

/** Нативная промо-карточка КосплейХаба в ленте — того же размера, что контент.
 *  Маскот раздела на мягком свечении + тихая метка «от КосплейХаб». */
type Promo = { mascot: string; glow: string; title: string; sub: string; href: string };

const PROMOS: Record<string, Promo> = {
  looks:        { mascot: "chameleon", glow: "124,58,237", title: "Заведи свою анкету", sub: "Косплееры уже здесь →", href: "/cabinet?tab=roles" },
  workshops:    { mascot: "robot",     glow: "124,249,255", title: "Открой мастерскую", sub: "Принимай заказы →", href: "/cabinet?tab=roles" },
  shoots:       { mascot: "kitsune",   glow: "255,45,111",  title: "Собери команду на съёмку", sub: "Создай съёмку →", href: "/shoots/new" },
  photographers:{ mascot: "octopus",   glow: "124,249,255", title: "Ты фотограф?", sub: "Добавь портфолио →", href: "/cabinet?tab=roles" },
  guides:       { mascot: "owl",       glow: "255,210,74",  title: "Поделись опытом крафта", sub: "Напиши гайд →", href: "/guides/new" },
  rent:         { mascot: "slime",     glow: "93,202,165",  title: "Сдай костюм в прокат", sub: "Добавь костюм →", href: "/rent/new" },
};

export default function PromoCard({ section }: { section: string }) {
  const p = PROMOS[section];
  if (!p) return null;
  const wrap: CSSProperties = {
    position: "relative", display: "flex", flexDirection: "column", overflow: "hidden",
    background: "var(--bg-2)", border: "1px solid rgba(157,124,255,.25)", borderRadius: 16,
  };
  return (
    <a href={p.href} style={wrap}>
      <span style={{ position: "absolute", top: 8, left: 8, zIndex: 2, fontSize: 9, letterSpacing: ".05em",
        color: "var(--ink-dim)", background: "rgba(0,0,0,.4)", borderRadius: 20, padding: "2px 8px" }}>ОТ КОСПЛЕЙХАБ</span>
      <div style={{ aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(90% 70% at 50% 38%, rgba(${p.glow},.28), #100d18 70%)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/mascots/${p.mascot}.png`} alt="" aria-hidden="true"
          style={{ width: "62%", height: "62%", objectFit: "contain",
            borderRadius: "50%", background: "#fff", padding: 6, boxShadow: `0 8px 30px rgba(${p.glow},.4)` }} />
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 15, color: "var(--ink)" }}>{p.title}</div>
        <div style={{ fontSize: 12, color: "var(--accent-2)", marginTop: 4 }}>{p.sub}</div>
      </div>
    </a>
  );
}
