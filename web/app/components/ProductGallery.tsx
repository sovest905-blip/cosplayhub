"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type Img = { id: number | string; url: string };

/** Галерея товара: крупное фото + лента миниатюр + лайтбокс (зум/стрелки/Esc). */
export default function ProductGallery({ images, title }: { images: Img[]; title: string }) {
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const n = images.length;
  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => setSel((i) => (i - 1 + n) % n), [n]);
  const next = useCallback(() => setSel((i) => (i + 1) % n), [n]);

  useEffect(() => {
    if (!open) return;
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

  const cur = images[sel];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        onClick={() => setOpen(true)}
        aria-label="Открыть фото крупнее"
        style={{
          aspectRatio: "1", borderRadius: 18, border: "1px solid var(--line)", overflow: "hidden",
          backgroundColor: "var(--bg-2)", backgroundImage: `url('${cur.url}')`,
          backgroundSize: "cover", backgroundPosition: "center", cursor: "zoom-in", width: "100%", padding: 0,
        }}
      />

      {n > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(64px,1fr))`, gap: 8 }}>
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setSel(i)}
              aria-label={`Фото ${i + 1}`}
              style={{
                aspectRatio: "1", borderRadius: 10, width: "100%", padding: 0, cursor: "pointer",
                border: `2px solid ${i === sel ? "var(--accent)" : "transparent"}`,
                backgroundImage: `url('${im.url}')`, backgroundSize: "cover", backgroundPosition: "center",
              }}
            />
          ))}
        </div>
      )}

      {mounted && open && createPortal(
        <div onClick={close} style={{
          position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.9)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <button onClick={close} aria-label="Закрыть" style={lbBtn({ top: 12, right: 12, fontSize: 24 })}>✕</button>
          {n > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Предыдущее"
              style={lbBtn({ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 30 })}>‹</button>
          )}
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "min(92vw,900px)", maxHeight: "92vh" }}>
            <img src={cur.url} alt={title} onClick={next}
              style={{ maxWidth: "100%", maxHeight: "88vh", objectFit: "contain", borderRadius: 12,
                cursor: n > 1 ? "pointer" : "default", display: "block", margin: "0 auto" }} />
            {n > 1 && (
              <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 10 }}>
                {sel + 1} / {n}
              </div>
            )}
          </div>
          {n > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Следующее"
              style={lbBtn({ right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 30 })}>›</button>
          )}
        </div>,
        document.body,
      )}
    </div>
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
