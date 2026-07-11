"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export type GalleryPhoto = { id: number | string; url: string; caption?: string };

/** Сетка фото с лайтбоксом (зум/стрелки/Esc), как в разделе «Образы».
 *  Переиспользуется на профиле (фотогалерея) и странице мастерской (примеры работ). */
export default function PhotoGallery({
  photos,
  minThumb = 120,
}: {
  photos: GalleryPhoto[];
  minThumb?: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(
    () => setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const next = useCallback(
    () => setOpen((i) => (i === null ? i : (i + 1) % photos.length)),
    [photos.length],
  );

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

  const cur = open === null ? null : photos[open];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${minThumb}px,1fr))`, gap: 6 }}>
        {photos.map((ph, i) => (
          <button
            key={ph.id}
            onClick={() => setOpen(i)}
            aria-label={ph.caption ? `Открыть фото «${ph.caption}»` : "Открыть фото"}
            style={{
              aspectRatio: "1", borderRadius: 10, display: "block", border: "none", padding: 0,
              cursor: "zoom-in", width: "100%",
              backgroundImage: `url('${ph.url}')`, backgroundSize: "cover", backgroundPosition: "center",
            }}
          />
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
          <button onClick={close} aria-label="Закрыть" style={lbBtn({ top: 12, right: 12, fontSize: 24 })}>✕</button>

          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Предыдущее"
              style={lbBtn({ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 30 })}>‹</button>
          )}

          <div onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(92vw, 900px)", maxHeight: "92vh", display: "flex", flexDirection: "column", gap: 12 }}>
            <img
              src={cur.url}
              alt={cur.caption || "Фото"}
              onClick={next}
              style={{ maxWidth: "100%", maxHeight: cur.caption ? "80vh" : "86vh", objectFit: "contain",
                borderRadius: 12, margin: "0 auto", cursor: photos.length > 1 ? "pointer" : "default", display: "block" }}
            />
            {cur.caption && (
              <div style={{ color: "#fff", fontSize: 14, textAlign: "center" }}>{cur.caption}</div>
            )}
            {photos.length > 1 && (
              <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                {open! + 1} / {photos.length}
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Следующее"
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
