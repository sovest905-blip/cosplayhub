"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { LookItem } from "../../lib/api";
import LikeButton from "./LikeButton";

const PLACEHOLDER = "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=600&q=80";

export default function LooksGrid({ looks }: { looks: LookItem[] }) {
  // Индекс открытого образа в лайтбоксе (null — закрыт).
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(
    () => setOpen((i) => (i === null ? i : (i - 1 + looks.length) % looks.length)),
    [looks.length],
  );
  const next = useCallback(
    () => setOpen((i) => (i === null ? i : (i + 1) % looks.length)),
    [looks.length],
  );

  // Клавиатура: Esc — закрыть, стрелки — листать. Блокируем скролл фона.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  const cur = open === null ? null : looks[open];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
        {looks.map((l, i) => (
          <article key={l.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <button
              onClick={() => setOpen(i)}
              aria-label={`Открыть образ «${l.title}»`}
              style={{
                aspectRatio: "3/4", backgroundSize: "cover", backgroundPosition: "center",
                backgroundImage: `url('${l.image || PLACEHOLDER}')`,
                border: "none", padding: 0, cursor: "zoom-in", width: "100%", display: "block",
              }}
            />
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <h3 style={{ fontSize: 15, margin: 0, cursor: "pointer" }} onClick={() => setOpen(i)}>{l.title}</h3>
              {l.character && <div style={{ fontSize: 12, color: "var(--accent-2)" }}>{l.character}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
                {l.author_id
                  ? <a href={`/people/${l.author_id}`} style={{ fontSize: 12, color: "var(--ink-dim)" }}>@{l.author_name}</a>
                  : <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>@{l.author_name}</span>}
                <LikeButton lookId={l.id} initialLiked={l.is_liked} initialCount={l.likes_count} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {mounted && cur && createPortal(
        <div
          onClick={close}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.9)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          {/* Закрыть */}
          <button onClick={close} aria-label="Закрыть"
            style={lbBtn({ top: 12, right: 12, fontSize: 24 })}>✕</button>

          {/* Назад */}
          {looks.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Предыдущий"
              style={lbBtn({ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 30 })}>‹</button>
          )}

          {/* Содержимое (клик внутри не закрывает) */}
          <div onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(92vw, 760px)", maxHeight: "92vh", display: "flex", flexDirection: "column", gap: 12 }}>
            <img
              src={cur.image || PLACEHOLDER}
              alt={cur.title}
              onClick={next}
              style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: 12,
                margin: "0 auto", cursor: looks.length > 1 ? "pointer" : "default", display: "block" }}
            />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, color: "#fff" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{cur.title}</div>
                {cur.character && <div style={{ fontSize: 13, color: "var(--accent-2)", marginTop: 2 }}>{cur.character}</div>}
                {cur.description && <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 6, lineHeight: 1.5 }}>{cur.description}</div>}
                {cur.author_id
                  ? <a href={`/people/${cur.author_id}`} style={{ fontSize: 12, color: "rgba(255,255,255,.6)", display: "inline-block", marginTop: 8 }}>@{cur.author_name}</a>
                  : <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", display: "inline-block", marginTop: 8 }}>@{cur.author_name}</span>}
              </div>
              <div style={{ flexShrink: 0 }}>
                <LikeButton lookId={cur.id} initialLiked={cur.is_liked} initialCount={cur.likes_count} />
              </div>
            </div>
            {looks.length > 1 && (
              <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                {open! + 1} / {looks.length}
              </div>
            )}
          </div>

          {/* Вперёд */}
          {looks.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Следующий"
              style={lbBtn({ right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 30 })}>›</button>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

function lbBtn(pos: React.CSSProperties): React.CSSProperties {
  return {
    position: "fixed", zIndex: 1001, width: 44, height: 44, borderRadius: "50%",
    background: "rgba(255,255,255,.12)", color: "#fff", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
    ...pos,
  };
}
