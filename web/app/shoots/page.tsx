import { getShoots, type ShootListItem, SHOOT_ROLE_RU } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

export default async function ShootsPage() {
  const shoots = (await getShoots().catch(() => null)) || [];

  if (shoots.length === 0) {
    return (
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="crumbs">
          <a href="/">Главная</a><span className="sep">›</span><span className="cur">Съёмки</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Съёмки</h1>
          <a href="/shoots/new" className="btn btn-primary btn-sm">+ Собрать команду</a>
        </div>
        <ComingSoon icon="📸" title="Собери команду на съёмку"
          desc="Косплеер + фотограф + локация + костюм от мастерской — в одном проекте. Создай первую съёмку и позови команду." />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Съёмки</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 6px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Съёмки</h1>
        <a href="/shoots/new" className="btn btn-primary btn-sm">+ Собрать команду</a>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 24px" }}>
        Косплеер, фотограф, локация и мастерская — собери команду на съёмку в один флоу.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {shoots.map((s: ShootListItem) => (
          <a key={s.id} href={`/shoots/${s.id}`} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ height: 130, backgroundSize: "cover", backgroundPosition: "center",
              backgroundImage: `url('${s.cover || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=700&q=80"}')` }} />
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: s.status === "open" ? "var(--green)" : "var(--ink-dim)",
                  border: "1px solid var(--line)", borderRadius: 20, padding: "2px 9px" }}>{s.status_display}</span>
                {s.date && <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{new Date(s.date).toLocaleDateString("ru-RU")}</span>}
              </div>
              <h3 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 17, margin: "10px 0 4px" }}>{s.title}</h3>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8 }}>
                📍 {s.city || "—"} · {s.confirmed_count} в команде · орг. @{s.organizer.username}
              </div>
              {Array.isArray(s.looking_for) && s.looking_for.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.looking_for.map((r) => (
                    <span key={r} style={{ fontSize: 11, color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.3)", borderRadius: 20, padding: "2px 9px" }}>
                      ищем: {SHOOT_ROLE_RU[r] || r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
