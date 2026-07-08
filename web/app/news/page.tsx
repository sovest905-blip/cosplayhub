import { getNews, type NewsItem } from "../../lib/api";
import { linkify } from "../../lib/linkify";

export const dynamic = "force-dynamic";

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return ""; }
}

export default async function NewsPage() {
  const news = (await getNews()) || [];

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">Новости</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: "8px 0 24px" }}>
        Новости
      </h1>

      {news.length === 0 ? (
        <div style={{
          padding: "48px 24px", textAlign: "center", color: "var(--ink-dim)",
          background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18,
        }}>
          Пока новостей нет. Загляните позже.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {news.map((n: NewsItem) => (
            <article key={n.id} style={{
              background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18,
              overflow: "hidden", display: "grid",
              gridTemplateColumns: n.image ? "240px 1fr" : "1fr",
            }}>
              {n.image && (
                <div style={{
                  backgroundImage: `url('${n.image}')`, backgroundSize: "cover",
                  backgroundPosition: "center", minHeight: 160,
                }} />
              )}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {n.is_pinned && (
                    <span style={{
                      fontSize: 11, color: "var(--accent-3)", border: "1px solid rgba(255,210,74,.3)",
                      borderRadius: 20, padding: "2px 9px",
                    }}>📌 Закреплено</span>
                  )}
                  <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{fmtDate(n.created_at)}</span>
                </div>
                <h2 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 19, margin: "0 0 8px" }}>
                  {n.title}
                </h2>
                {n.body && (
                  <p style={{ color: "var(--ink-dim)", fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                    {linkify(n.body)}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
