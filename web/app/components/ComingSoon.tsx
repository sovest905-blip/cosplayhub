export default function ComingSoon({
  icon,
  title,
  desc,
  eyebrow = "раздел в разработке",
}: {
  icon: string;
  title: string;
  desc: string;
  eyebrow?: string;
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
        <div className="eyebrow" style={{ justifyContent: "center" }}>{eyebrow}</div>
        <h1
          style={{
            fontFamily: "var(--font-display),sans-serif",
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "6px 0 12px",
          }}
        >
          {title}
        </h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 14, lineHeight: 1.6, margin: "0 auto 28px", maxWidth: 420 }}>
          {desc}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/" className="btn btn-ghost">← На главную</a>
          <a href="/auth/register" className="btn btn-primary">Войти в бету →</a>
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: "var(--ink-dim)" }}>
          Появится в ближайших обновлениях закрытой беты.
        </p>
      </div>
    </div>
  );
}
