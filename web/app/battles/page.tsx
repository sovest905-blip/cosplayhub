import { getBattles, type BattleListItem } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  voting: "var(--green)", upcoming: "var(--accent-2)", finished: "var(--ink-dim)",
};

export default async function BattlesPage() {
  const battles = (await getBattles().catch(() => null)) || [];

  if (battles.length === 0) {
    return (
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="crumbs">
          <a href="/">Главная</a><span className="sep">›</span><span className="cur">Баттлы</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Косплей-баттлы</h1>
          <a href="/battles/new" className="btn btn-primary btn-sm">+ Создать баттл</a>
        </div>
        <ComingSoon icon="⚔" title="Косплей-баттлы"
          desc="Тематические конкурсы образов с народным голосованием. Заявите свой образ и поборитесь за топ." />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Баттлы</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 6px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Косплей-баттлы</h1>
        <a href="/battles/new" className="btn btn-primary btn-sm">+ Создать баттл</a>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 24px" }}>
        Тематические конкурсы образов. Голосуйте за лучших и выставляйте свои работы.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {battles.map((b: BattleListItem) => (
          <a key={b.id} href={`/battles/${b.id}`} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ height: 130, backgroundSize: "cover", backgroundPosition: "center",
              backgroundImage: `url('${b.cover || "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=700&q=80"}')` }} />
            <div style={{ padding: 16 }}>
              <span style={{ fontSize: 11, color: STATUS_COLOR[b.status] || "var(--ink-dim)",
                border: "1px solid var(--line)", borderRadius: 20, padding: "2px 9px" }}>{b.status_display}</span>
              <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 17, margin: "10px 0 4px" }}>{b.title}</h3>
              {b.theme && <div style={{ fontSize: 12, color: "var(--accent-2)", marginBottom: 4 }}>{b.theme}</div>}
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {b.entries_count} участн.{b.ends_at ? ` · до ${new Date(b.ends_at).toLocaleDateString("ru-RU")}` : ""}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
