import { getGuide } from "../../../lib/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return ""; }
}

// Текст гайда с маркерами [фото:N] → чередование абзацев и картинок.
// Возвращает узлы + множество использованных номеров фото.
function renderBody(body: string, photos: { id: number; url: string }[]) {
  const used = new Set<number>();
  const parts = body.split(/\[фото:(\d+)\]/g);
  const nodes = parts.map((part, i) => {
    if (i % 2 === 1) {
      const n = Number(part);
      const ph = photos[n - 1];
      if (!ph) return null;
      used.add(n);
      return (
        <img key={`ph-${i}`} src={ph.url} alt={`Фото ${n}`} style={{
          display: "block", width: "100%", borderRadius: 14, margin: "18px 0",
        }} />
      );
    }
    return part ? <span key={`tx-${i}`}>{part}</span> : null;
  });
  return { nodes, used };
}

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await getGuide(id).catch(() => null);
  if (!g) notFound();

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 820 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/guides">Гайды</a><span className="sep">›</span>
        <span className="cur">{g.title}</span>
      </div>

      {g.cover && (
        <div style={{ height: 280, borderRadius: 18, margin: "12px 0 20px", backgroundSize: "cover",
          backgroundPosition: "center", backgroundImage: `url('${g.cover}')` }} />
      )}

      {g.category && (
        <span style={{ fontSize: 12, color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.25)",
          borderRadius: 20, padding: "3px 11px" }}>{g.category}</span>
      )}
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: "clamp(26px,4vw,40px)", margin: "14px 0 8px" }}>
        {g.title}
      </h1>
      <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 24 }}>
        {g.author_id
          ? <a href={`/people/${g.author_id}`} style={{ color: "var(--accent-2)" }}>@{g.author_name}</a>
          : (g.author_name ? `@${g.author_name}` : "Редакция")}
        {" · "}{fmtDate(g.created_at)}
      </div>

      {g.summary && (
        <p style={{ fontSize: 17, color: "var(--ink)", lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>{g.summary}</p>
      )}
      <GuideBody body={g.body} photos={g.photos || []} />
    </div>
  );
}

function GuideBody({ body, photos }: { body: string; photos: { id: number; url: string }[] }) {
  const { nodes, used } = renderBody(body || "Текст гайда скоро будет дополнен.", photos);
  const rest = photos.filter((_, i) => !used.has(i + 1));
  return (
    <>
      <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
        {nodes}
      </div>
      {rest.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginTop: 24 }}>
          {rest.map((ph) => (
            <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" style={{
              aspectRatio: "4/3", borderRadius: 12, display: "block",
              backgroundImage: `url('${ph.url}')`, backgroundSize: "cover", backgroundPosition: "center",
            }} />
          ))}
        </div>
      )}
    </>
  );
}
