// Вкладка «Мои съёмки» кабинета. Вынесена из page.tsx (god-компонент).
type Props = {
  myShoots: { organized: any[]; participating: any[] } | null;
};

export default function ShootsTab({ myShoots }: Props) {
  const renderShootRow = (sh: any) => (
    <a key={sh.id} href={`/shoots/${sh.id}`} className="info-row" style={{ alignItems: "center" }}>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <b style={{ fontSize: 14 }}>{sh.title}</b>
        <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
          📍 {sh.city || "—"}{sh.date ? ` · ${new Date(sh.date).toLocaleDateString("ru-RU")}` : ""} · {sh.confirmed_count} в команде
        </span>
      </span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {sh.my_participation?.status === "invited" && <span style={{ fontSize: 11, color: "var(--accent-3)", border: "1px solid rgba(255,210,74,.3)", borderRadius: 20, padding: "2px 9px" }}>приглашение</span>}
        <span style={{ fontSize: 11, color: sh.status === "open" ? "var(--green)" : "var(--ink-dim)" }}>{sh.status_display}</span>
      </span>
    </a>
  );
  const org = myShoots?.organized || [];
  const part = myShoots?.participating || [];
  return (
    <div className="acc-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Мои съёмки</h2>
        <a href="/shoots/new" className="btn btn-primary btn-sm">+ Собрать команду</a>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
        Собирайте команду на съёмку: косплееры, фотограф, локация, костюм от мастерской.
      </p>

      <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 8px" }}>Я организую ({org.length})</h3>
      {org.length > 0 ? org.map(renderShootRow)
        : <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 16px" }}>Вы пока не создавали съёмок.</p>}

      <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "18px 0 8px" }}>Я участвую ({part.length})</h3>
      {part.length > 0 ? part.map(renderShootRow)
        : <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0 }}>Откликнитесь на съёмку в <a href="/shoots">каталоге</a>.</p>}
    </div>
  );
}
