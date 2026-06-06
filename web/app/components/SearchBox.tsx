"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_RU: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};
const WS_TYPE_RU: Record<string, string> = {
  print3d: "3D-печать", eva: "EVA", sewing: "Пошив", wigs: "Парики",
};
const LISTING_RU: Record<string, string> = {
  job: "Ищу спеца", collab: "Коллаб", sell: "Продажа", buy: "Покупка",
};

type Results = {
  q: string;
  sections: { label: string; url: string }[];
  profiles: { id: number; display_name: string; city: string; roles: string[]; avatar: string | null }[];
  workshops: { id: number; name: string; type: string; city: string; cover: string | null }[];
  listings: { id: number; title: string; type: string; city: string; price: number | null }[];
};

const EMPTY: Results = { q: "", sections: [], profiles: [], workshops: [], listings: [] };

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Дебаунс-запрос подсказок
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRes(EMPTY); setLoading(false); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/search/?q=${encodeURIComponent(term)}`);
        if (r.ok) { setRes(await r.json()); setOpen(true); }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  function goAll(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function go(url: string) {
    setOpen(false);
    setQ("");
    router.push(url);
  }

  const total = res.profiles.length + res.workshops.length + res.listings.length + res.sections.length;

  return (
    <div className="nav-search" ref={boxRef} style={{ position: "relative" }}>
      <form onSubmit={goAll}>
        <input
          placeholder="Поиск по сайту..."
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (total > 0) setOpen(true); }}
          aria-label="Поиск"
        />
      </form>

      {open && q.trim().length >= 2 && (
        <div className="search-drop">
          {loading && total === 0 && (
            <div className="search-empty">Идёт поиск…</div>
          )}
          {!loading && total === 0 && (
            <div className="search-empty">Ничего не найдено по «{q.trim()}»</div>
          )}

          {res.sections.length > 0 && (
            <div className="search-group">
              <div className="search-cat">Разделы</div>
              {res.sections.map((s) => (
                <button key={s.url} className="search-row" onClick={() => go(s.url)}>
                  <span className="search-ic">◈</span>
                  <span className="search-main">{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {res.profiles.length > 0 && (
            <div className="search-group">
              <div className="search-cat">Люди</div>
              {res.profiles.map((p) => (
                <button key={p.id} className="search-row" onClick={() => go(`/people/${p.id}`)}>
                  <span className="search-av" style={{
                    background: p.avatar ? `url('${p.avatar}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
                  }}>{!p.avatar && (p.display_name || "?").charAt(0).toUpperCase()}</span>
                  <span className="search-main">{p.display_name}</span>
                  <span className="search-sub">{(p.roles || []).map((r) => ROLE_RU[r] || r)[0] || "Косплеер"}{p.city ? ` · ${p.city}` : ""}</span>
                </button>
              ))}
            </div>
          )}

          {res.workshops.length > 0 && (
            <div className="search-group">
              <div className="search-cat">Мастерские</div>
              {res.workshops.map((w) => (
                <button key={w.id} className="search-row" onClick={() => go(`/workshops/${w.id}`)}>
                  <span className="search-av" style={{
                    background: w.cover ? `url('${w.cover}') center/cover` : "linear-gradient(135deg,var(--accent-2),var(--accent-4))",
                  }}>{!w.cover && "◆"}</span>
                  <span className="search-main">{w.name}</span>
                  <span className="search-sub">{WS_TYPE_RU[w.type] || w.type}{w.city ? ` · ${w.city}` : ""}</span>
                </button>
              ))}
            </div>
          )}

          {res.listings.length > 0 && (
            <div className="search-group">
              <div className="search-cat">Объявления</div>
              {res.listings.map((l) => (
                <button key={l.id} className="search-row" onClick={() => go("/market")}>
                  <span className="search-ic">✦</span>
                  <span className="search-main">{l.title}</span>
                  <span className="search-sub">{LISTING_RU[l.type] || l.type}{l.city ? ` · ${l.city}` : ""}</span>
                </button>
              ))}
            </div>
          )}

          {total > 0 && (
            <button className="search-all" onClick={() => goAll()}>
              Показать все результаты по «{q.trim()}» →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
