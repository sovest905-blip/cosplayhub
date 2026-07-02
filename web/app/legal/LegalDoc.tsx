import type { ReactNode } from "react";

export const LEGAL_DOCS = [
  { slug: "terms", title: "Пользовательское соглашение", short: "Соглашение" },
  { slug: "privacy", title: "Политика конфиденциальности", short: "Конфиденциальность" },
  { slug: "offer", title: "Оферта на платные услуги", short: "Оферта" },
  { slug: "rules", title: "Правила сообщества", short: "Правила" },
  { slug: "cookies", title: "Политика cookie", short: "Cookie" },
] as const;

export const SUPPORT_EMAIL = "support@cosplayhub.kz";

export function LegalDoc({
  current,
  title,
  updated = "3 июля 2026 года",
  version = "1.0",
  children,
}: {
  current: string;
  title: string;
  updated?: string;
  version?: string;
  children: ReactNode;
}) {
  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 64 }}>
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">{title}</span>
      </div>

      <div className="legal-head">
        <h1>{title}</h1>
        <div className="legal-meta">
          <span>Редакция {version}</span>
          <span className="dot">·</span>
          <span>Вступает в силу: {updated}</span>
        </div>
      </div>

      <nav className="legal-nav" aria-label="Документы">
        {LEGAL_DOCS.map((d) => (
          <a key={d.slug} href={`/legal/${d.slug}`} className={d.slug === current ? "cur" : ""}>
            {d.short}
          </a>
        ))}
      </nav>

      <article className="legal">{children}</article>
    </div>
  );
}
