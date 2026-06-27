// Пустое состояние ЖИВОГО раздела (из API пришёл пустой список). В отличие от
// ComingSoon — честный текст «пока пусто» + реальная кнопка действия, без
// «раздел в разработке» / «войти в бету».
export default function EmptyState({
  icon,
  title,
  desc,
  ctaHref,
  ctaLabel,
}: {
  icon: string;
  title: string;
  desc: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">{title}</span>
      </div>

      <div
        style={{
          maxWidth: 560,
          margin: "40px auto 0",
          textAlign: "center",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "48px 36px",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
        <h1
          style={{
            fontFamily: "var(--font-display),sans-serif",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "0 0 12px",
          }}
        >
          {title}
        </h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 14, lineHeight: 1.6, margin: "0 auto 28px", maxWidth: 420 }}>
          {desc}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {ctaHref && ctaLabel && <a href={ctaHref} className="btn btn-primary">{ctaLabel}</a>}
          <a href="/" className="btn btn-ghost">← На главную</a>
        </div>
      </div>
    </div>
  );
}
