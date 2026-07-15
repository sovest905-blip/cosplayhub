// Общий пустой стейт (карточка со значком/текстом/CTA). Вынесен из page.tsx (god-компонент) —
// используется во всех вкладках кабинета.
export default function EmptyBlock({ icon, title, sub, cta }: {
  icon: string; title: string; sub: string; cta?: { label: string; href: string };
}) {
  return (
    <div className="empty-state">
      <div className="empty-glyph">{icon}</div>
      <p className="empty-title">{title}</p>
      <p className="empty-sub">{sub}</p>
      {cta && <a href={cta.href} className="btn btn-ghost" style={{ marginTop: 8 }}>{cta.label} →</a>}
    </div>
  );
}
