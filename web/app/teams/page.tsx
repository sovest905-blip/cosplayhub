import { getTeams, type TeamListItem } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = (await getTeams().catch(() => null)) || [];

  if (teams.length === 0) {
    return (
      <ComingSoon icon="♛" title="Команды"
        desc="Косплей-команды для групповых сетов и конвентов. Создай свою команду в один клик." />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Команды</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Команды</h1>
        <a href="/teams/new" className="btn btn-primary btn-sm">+ Создать команду</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {teams.map((t: TeamListItem) => (
          <a key={t.id} href={`/teams/${t.id}`} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ height: 110, backgroundSize: "cover", backgroundPosition: "center",
              backgroundImage: `url('${t.cover || "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80"}')` }} />
            <div style={{ padding: "0 16px 16px", marginTop: -28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, border: "3px solid var(--bg-2)",
                backgroundSize: "cover", backgroundPosition: "center",
                background: t.avatar ? `center/cover url('${t.avatar}')` : "linear-gradient(135deg,var(--accent),var(--accent-4))" }} />
              <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 17, margin: "10px 0 4px" }}>{t.name}</h3>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                📍 {t.city || "—"} · {t.members_count} участн. · ♥ {t.likes_count}
              </div>
              {t.is_open && <span style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: "var(--green)", border: "1px solid rgba(63,219,138,.3)", borderRadius: 20, padding: "2px 9px" }}>Открытый набор</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
