import { getLooks, LOOK_STAGE_RU } from "../../lib/api";
import LooksGrid from "../components/LooksGrid";
import EmptyState from "../components/EmptyState";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "", label: "Все" },
  { key: "planned", label: "Хочу скосплеить" },
  { key: "wip", label: "В работе" },
  { key: "done", label: "Готовые" },
];

export default async function LooksPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage = "" } = await searchParams;
  const q = stage && LOOK_STAGE_RU[stage] ? `?stage=${stage}` : "";
  const looks = (await getLooks(q).catch(() => null)) || [];

  // Пустой раздел целиком (без фильтра) — честный empty-state.
  if (looks.length === 0 && !stage) {
    return (
      <EmptyState icon="✧" title="Образы"
        desc="Образов пока нет. Добавьте свой косплей-образ в кабинете (роль «Косплеер») — с тегами по персонажам и лайками."
        ctaHref="/cabinet?tab=roles" ctaLabel="+ Добавить образ" />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Образы</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 16px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Образы</h1>
        <a href="/cabinet?tab=roles" className="btn btn-primary btn-sm">+ Добавить образ</a>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {FILTERS.map((f) => {
          const active = (f.key || "") === (stage || "");
          return (
            <a key={f.key} href={f.key ? `/looks?stage=${f.key}` : "/looks"}
              style={{ fontSize: 13, padding: "6px 14px", borderRadius: 20,
                border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                background: active ? "rgba(255,45,111,.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--ink-dim)" }}>{f.label}</a>
          );
        })}
      </div>

      {looks.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--ink-dim)", padding: "24px 0" }}>
          В этой категории пока пусто.
        </p>
      ) : (
        <LooksGrid looks={looks} />
      )}
    </div>
  );
}
