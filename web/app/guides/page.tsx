import { getGuides, type GuideItem } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export default async function GuidesPage() {
  const guides = (await getGuides().catch(() => null)) || [];

  if (guides.length === 0) {
    return (
      <ComingSoon icon="▤" title="Гайды"
        desc="Туториалы по крафту: EVA, термоформовка, покраска, парики, грим. Скоро здесь появятся материалы." />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Гайды</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Гайды</h1>
        <a href="/guides/new" className="btn btn-primary btn-sm">+ Написать гайд</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18 }}>
        {guides.map((g: GuideItem) => (
          <a key={g.id} href={`/guides/${g.id}`} style={{
            background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              height: 150, backgroundSize: "cover", backgroundPosition: "center",
              backgroundImage: `url('${g.cover || "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80"}')`,
            }} />
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {g.category && (
                <span style={{ fontSize: 11, color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.25)",
                  borderRadius: 20, padding: "2px 9px", alignSelf: "flex-start" }}>{g.category}</span>
              )}
              <h2 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 17, margin: 0 }}>{g.title}</h2>
              {g.summary && <p style={{ color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{g.summary}</p>}
              <span style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: "auto" }}>
                {g.author_name ? `${g.author_name} · ` : ""}{fmtDate(g.created_at)}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
