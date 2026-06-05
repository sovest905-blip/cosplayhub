export const dynamic = "force-dynamic";

const ROLE_RU: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};
const WS_TYPE_RU: Record<string, string> = {
  print3d: "3D-печать", eva: "EVA", sewing: "Швейная", wigs: "Парики",
};

function base() {
  return process.env.API_URL || "http://web:8000/api/v1";
}

type SearchResult = {
  q: string;
  profiles: { id: number; display_name: string; city: string; roles: string[]; avatar: string | null }[];
  workshops: { id: number; name: string; type: string; city: string; cover: string | null }[];
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();

  let data: SearchResult = { q, profiles: [], workshops: [] };
  if (q.length >= 2) {
    try {
      const res = await fetch(`${base()}/search/?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (res.ok) data = await res.json();
    } catch { /* пустой результат */ }
  }

  const total = data.profiles.length + data.workshops.length;

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">поиск{q ? ` · «${q}»` : ""}</div>
        <h1 className="huge" style={{ fontSize: "clamp(28px,4vw,52px)" }}>
          {q.length < 2
            ? <>Введите <span className="accent">запрос.</span></>
            : total > 0
            ? <>Найдено <span className="accent">{total}.</span></>
            : <>Ничего <span className="accent">не найдено.</span></>}
        </h1>
      </section>

      {q.length >= 2 && (
        <section style={{ paddingTop: 28 }}>
          {data.profiles.length > 0 && (
            <>
              <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 16, margin: "0 0 14px", color: "var(--ink-dim)" }}>
                Люди ({data.profiles.length})
              </h3>
              <div className="people-grid" style={{ marginBottom: 36 }}>
                {data.profiles.map((p) => (
                  <a key={p.id} href={`/people/${p.id}`} className="person" style={{ color: "inherit" }}>
                    <div className="person-img" style={{
                      background: p.avatar ? `url('${p.avatar}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
                    }} />
                    <div className="person-info">
                      <div className="person-name">{p.display_name}</div>
                      <div className="person-meta">
                        <span>{(p.roles || []).map((r) => ROLE_RU[r] || r).join(" · ") || "Косплеер"}</span>
                        <span>{p.city || "—"}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}

          {data.workshops.length > 0 && (
            <>
              <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 16, margin: "0 0 14px", color: "var(--ink-dim)" }}>
                Мастерские ({data.workshops.length})
              </h3>
              <div className="workshops-grid">
                {data.workshops.map((w) => (
                  <a key={w.id} href={`/workshops/${w.id}`} className="ws-card">
                    <div className="ws-cover" style={{
                      backgroundImage: w.cover ? `url('${w.cover}')` : undefined,
                    }}>
                      <div className="ws-type">{WS_TYPE_RU[w.type] || w.type}</div>
                    </div>
                    <div className="ws-body">
                      <div className="ws-name">{w.name}</div>
                      <div className="ws-loc">📍 {w.city || "—"}</div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}

          {total === 0 && (
            <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18 }}>
              <div className="empty-glyph">⌕</div>
              <p className="empty-title">Ничего не найдено</p>
              <p className="empty-sub">Попробуйте другой запрос — имя косплеера, мастерскую или город.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
