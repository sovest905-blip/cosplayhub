import { PLANS as PRICE_PLANS, fmtPrice, PRO_FREE_BETA } from "../../lib/pricing";
import ProCta from "../components/ProCta";

const PLANS = [
  {
    key: PRICE_PLANS.free.key,
    name: PRICE_PLANS.free.name,
    price: fmtPrice(PRICE_PLANS.free.price),
    period: PRICE_PLANS.free.period,
    accent: "var(--ink-dim)",
    features: [
      "Профиль косплеера",
      "Каталог и поиск",
      "Заявки в мастерские",
      "Участие в событиях",
    ],
    cta: "Начать бесплатно",
    highlight: false,
  },
  {
    key: PRICE_PLANS.pro.key,
    name: PRICE_PLANS.pro.name,
    price: fmtPrice(PRICE_PLANS.pro.price),
    period: PRICE_PLANS.pro.period,
    freeNote: `Первые ${PRO_FREE_BETA.months} месяцев бесплатно`,
    accent: "var(--accent)",
    features: [
      "Всё из бесплатного",
      "Синяя галочка верификации",
      "Приоритет в каталоге и поиске",
      "Расширенная аналитика профиля",
      { t: "Подписки фанатов (монетизация)", soon: true },
      { t: "0% комиссии на заказы", soon: true },
    ],
    cta: "Оформить Pro",
    highlight: true,
  },
  {
    key: PRICE_PLANS.workshop.key,
    name: PRICE_PLANS.workshop.name,
    price: fmtPrice(PRICE_PLANS.workshop.price),
    period: PRICE_PLANS.workshop.period,
    freeNote: `Первые ${PRO_FREE_BETA.months} месяцев бесплатно`,
    accent: "var(--accent-3)",
    features: [
      "Витрина мастерской с услугами",
      "Boost в каталоге услуг",
      "Управление заказами и статусами",
      "Бизнес-аналитика",
      { t: "Приём заказов без комиссии", soon: true },
    ],
    cta: "Подключить мастерскую",
    highlight: false,
  },
];

export default function ProPage() {
  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <div className="crumbs" style={{ paddingTop: 16 }}>
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">Pro-тарифы</span>
      </div>

      <section className="hero" style={{ paddingBottom: 8, textAlign: "center" }}>
        <div className="eyebrow" style={{ justifyContent: "center" }}>тарифы · закрытая бета</div>
        <h1 className="huge" style={{ fontSize: "clamp(32px,5vw,60px)" }}>
          Прокачай <span className="accent">профиль.</span>
        </h1>
        <p className="hero-sub" style={{ marginLeft: "auto", marginRight: "auto" }}>
          Первые {PRO_FREE_BETA.months} месяцев <strong style={{ color: "var(--ink)" }}>Pro бесплатно</strong>, потом {fmtPrice(PRICE_PLANS.pro.price)}/мес.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
          marginTop: 28,
          alignItems: "start",
        }}
      >
        {PLANS.map((p) => (
          <div
            key={p.name}
            style={{
              background: "var(--bg-2)",
              border: p.highlight ? `1px solid ${p.accent}` : "1px solid var(--line)",
              borderRadius: 18,
              padding: "28px 26px",
              position: "relative",
              boxShadow: p.highlight ? "0 0 0 1px var(--accent), 0 8px 40px rgba(255,45,111,.15)" : "none",
            }}
          >
            {p.highlight && (
              <div
                style={{
                  position: "absolute", top: -11, left: 26,
                  background: "var(--accent)", color: "#fff",
                  fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
                  textTransform: "uppercase", padding: "4px 10px", borderRadius: 6,
                  fontFamily: "var(--font-mono),monospace",
                }}
              >
                Популярный
              </div>
            )}
            <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 18, color: p.accent }}>
              {p.name}
            </div>
            <div style={{ margin: "12px 0 4px", display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-.02em" }}>{p.price}</span>
              <span style={{ color: "var(--ink-dim)", fontSize: 12 }}>/ {p.period}</span>
            </div>
            {p.freeNote && (
              <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginBottom: 4 }}>{p.freeNote}</div>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              {p.features.map((f) => {
                const label = typeof f === "string" ? f : f.t;
                const soon = typeof f === "object" && f.soon;
                return (
                  <li key={label} style={{ display: "flex", gap: 9, fontSize: 13, color: soon ? "var(--ink-dim)" : "var(--ink)", lineHeight: 1.4 }}>
                    <span style={{ color: soon ? "var(--ink-dim)" : p.accent, flexShrink: 0 }}>{soon ? "○" : "✓"}</span>
                    <span>{label}{soon && <span style={{ fontSize: 10, color: "var(--accent-3)", marginLeft: 6, border: "1px solid rgba(255,210,74,.3)", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>скоро</span>}</span>
                  </li>
                );
              })}
            </ul>
            <ProCta planKey={p.key} label={p.cta} highlight={p.highlight} />
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: 28, fontSize: 12, color: "var(--ink-dim)" }}>
        Цены ориентировочные на период беты и могут измениться к публичному запуску.
      </p>
    </div>
  );
}
