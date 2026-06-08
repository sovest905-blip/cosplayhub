import { getMoodboards, type MoodboardListItem } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

const PH = "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=80";

export default async function MoodboardsPage() {
  const boards = (await getMoodboards().catch(() => null)) || [];

  if (boards.length === 0) {
    return (
      <ComingSoon icon="◇" title="Доски (мудборды)"
        desc="Собирай референсы образов, палитры и отсылки на отдельных досках. Создай свою доску." />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Доски</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Доски</h1>
        <a href="/moodboards/new" className="btn btn-primary btn-sm">+ Создать доску</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
        {boards.map((b: MoodboardListItem) => (
          <a key={b.id} href={`/moodboards/${b.id}`} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ aspectRatio: "4/3", backgroundSize: "cover", backgroundPosition: "center",
              backgroundImage: `url('${b.cover_url || PH}')` }} />
            <div style={{ padding: "12px 16px" }}>
              <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 16, margin: "0 0 4px" }}>{b.title}</h3>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>@{b.owner_name} · {b.items_count} картинок</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
