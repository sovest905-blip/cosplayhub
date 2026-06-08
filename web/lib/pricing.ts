// ─────────────────────────────────────────────────────────────────────────────
// Единый конфиг цен платформы. ВСЕ суммы, которые задаёт сам КосплейХаб
// (тарифы, поддержка авторов), живут здесь — меняй в одном месте.
//
// NB: цены УСЛУГ мастерских, объявлений и локаций задают сами пользователи —
// они не здесь, а в БД (price_from / price / role_details.price_hour).
//
// ВАЖНО: платежи пока заглушки (до ТОО). Это только отображаемые цифры.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCY = "₸";

export type Plan = {
  key: "free" | "pro" | "workshop";
  name: string;
  price: number;        // 0 = бесплатно
  period: string;       // «навсегда» / «в месяц»
};

export const PLANS: Record<Plan["key"], Plan> = {
  free:     { key: "free",     name: "Бесплатный", price: 0,    period: "навсегда" },
  pro:      { key: "pro",      name: "Pro",        price: 1990, period: "в месяц" },
  workshop: { key: "workshop", name: "Мастерская", price: 4990, period: "в месяц" },
};

// Подписка фанатов («Поддержать · от N₸») на странице косплеера.
export const FAN_SUPPORT_FROM = 500;

// Бета-акция: сколько месяцев Pro бесплатно и для скольких первых участников.
export const PRO_FREE_BETA = { months: 3, slots: 200 };

// Формат суммы: 1990 → «1 990 ₸», 0 → «0 ₸».
export function fmtPrice(n: number, currency = CURRENCY): string {
  return `${Number(n || 0).toLocaleString("ru-RU")} ${currency}`;
}
