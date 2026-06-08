// Единый конфиг анкет ролей (role_details). Используется и в кабинете (юзер
// редактирует свою анкету), и в админ-панели (админ правит анкету за юзера).
"use client";

// Лимит фотогалереи по ролям (макс среди ролей профиля). 0 = галерея недоступна.
export const GALLERY_LIMITS: Record<string, number> = { location: 20, photographer: 15, cosplayer: 15 };
export function galleryLimit(roles: string[]): number {
  return Math.max(0, ...(roles || []).map((r) => GALLERY_LIMITS[r] || 0));
}

export type RoleField = {
  key: string; label: string;
  type: "text" | "number" | "select" | "multi" | "toggle" | "textarea";
  options?: string[]; placeholder?: string;
};

export const ROLE_FORMS: Record<string, { title: string; icon: string; hint: string; fields: RoleField[] }> = {
  cosplayer: {
    title: "Анкета косплеера", icon: "◉",
    hint: "Покажем в каталоге косплееров и подберём коллабы",
    fields: [
      { key: "amplua", label: "Амплуа", type: "multi", options: ["Косплеер", "Костюмер", "Гримёр", "Реквизитор", "Мейкер"] },
      { key: "fandoms", label: "Фандомы", type: "text", placeholder: "Genshin, Naruto, Marvel" },
      { key: "level", label: "Уровень", type: "select", options: ["Новичок", "Любитель", "Продвинутый", "Профи"] },
      { key: "open_collab", label: "Открыт к коллаборациям", type: "toggle" },
    ],
  },
  photographer: {
    title: "Анкета фотографа", icon: "◐",
    hint: "Косплееры найдут тебя для съёмок",
    fields: [
      { key: "shoot_types", label: "Тип съёмки", type: "multi", options: ["Студийная", "Выездная", "Конвеншн", "Предметная"] },
      { key: "price_hour", label: "Стоимость, ₸/час от", type: "number", placeholder: "10000" },
      { key: "gear", label: "Оборудование", type: "text", placeholder: "Sony A7 IV, выездной свет" },
      { key: "portfolio_url", label: "Ссылка на портфолио", type: "text", placeholder: "https://..." },
    ],
  },
  shop: {
    title: "Анкета магазина", icon: "⌂",
    hint: "Появишься в разделе магазинов",
    fields: [
      { key: "shop_name", label: "Название магазина", type: "text", placeholder: "CosplayShop KZ" },
      { key: "sells", label: "Что продаёшь", type: "text", placeholder: "Линзы, парики, ткани, фурнитура" },
      { key: "contact", label: "Ссылка / контакт для заказов", type: "text", placeholder: "@shop или https://..." },
      { key: "delivery_cis", label: "Доставка по СНГ", type: "toggle" },
    ],
  },
  location: {
    title: "Анкета локации", icon: "⌖",
    hint: "Косплееры арендуют твою площадку для съёмок",
    fields: [
      { key: "loc_type", label: "Тип локации", type: "select", options: ["Фотостудия", "Интерьер", "Улица / природа", "Ивент-площадка"] },
      { key: "price_hour", label: "Цена, ₸/час", type: "number", placeholder: "8000" },
      { key: "capacity", label: "Площадь / вместимость", type: "text", placeholder: "60 м², до 10 человек" },
      { key: "amenities", label: "Что есть", type: "text", placeholder: "Свет, фоны, гримёрка, парковка" },
      // Соцсети/контакты именно локации (отдельно от личных соцсетей юзера)
      { key: "loc_instagram", label: "Instagram локации", type: "text", placeholder: "@studio или ссылка" },
      { key: "loc_tiktok", label: "TikTok локации", type: "text", placeholder: "@studio или ссылка" },
      { key: "loc_whatsapp", label: "WhatsApp / телефон для брони", type: "text", placeholder: "+7 700 000 00 00" },
      { key: "loc_site", label: "Сайт / 2GIS", type: "text", placeholder: "https://..." },
    ],
  },
  fan: {
    title: "Анкета фаната", icon: "♥",
    hint: "Расскажи о себе — найдём единомышленников и подберём ленту",
    fields: [
      { key: "fandoms", label: "Любимые фандомы", type: "text", placeholder: "Genshin, Naruto, Marvel" },
      { key: "hobbies", label: "Хобби", type: "multi", options: ["Аниме", "Манга", "Игры", "Настолки", "Рисование", "Музыка", "Фигурки", "K-pop", "Комиксы", "Фэнтези"] },
    ],
  },
};

// Презентационный рендер полей анкеты одной роли. Значения хранит вызывающий,
// изменения возвращает через onChange(key, value).
export function RoleFields({ role, values, onChange }: {
  role: string;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const cfg = ROLE_FORMS[role];
  if (!cfg) return null;
  return (
    <>
      {cfg.fields.map((f) => {
        if (f.type === "toggle") {
          return (
            <div key={f.key} className="toggle-row" style={{ padding: "8px 0" }}>
              <div><strong style={{ fontSize: 13 }}>{f.label}</strong></div>
              <div className={`toggle${values[f.key] ? " on" : ""}`}
                onClick={() => onChange(f.key, !values[f.key])} style={{ cursor: "pointer" }} />
            </div>
          );
        }
        if (f.type === "multi") {
          const arr: string[] = Array.isArray(values[f.key]) ? values[f.key] : [];
          return (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {f.options!.map((opt) => {
                  const on = arr.includes(opt);
                  return (
                    <button key={opt} type="button"
                      onClick={() => onChange(f.key, on ? arr.filter((x) => x !== opt) : [...arr, opt])}
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                        background: on ? "rgba(255,45,111,.15)" : "var(--bg)",
                        border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                        color: on ? "var(--accent)" : "var(--ink-dim)" }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (f.type === "select") {
          return (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <select value={values[f.key] || ""} onChange={(e) => onChange(f.key, e.target.value)}>
                <option value="">Не выбрано</option>
                {f.options!.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          );
        }
        if (f.type === "textarea") {
          return (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <textarea rows={2} value={values[f.key] || ""} placeholder={f.placeholder}
                onChange={(e) => onChange(f.key, e.target.value)} />
            </div>
          );
        }
        return (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input type={f.type === "number" ? "number" : "text"} value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => onChange(f.key, e.target.value)} />
          </div>
        );
      })}
    </>
  );
}
