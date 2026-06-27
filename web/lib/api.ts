// Серверные хелперы: тянут реальные данные из API, нормализуют под UI.
// API публичный на чтение (profiles/workshops). Фолбэк на mock — у вызывающего.

const PLACEHOLDER_PERSON = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80";
const PLACEHOLDER_WS = "https://images.unsplash.com/photo-1631544114551-e3f12e3e1f99?w=700&q=80";

function base() {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://web:8000/api/v1";
}

const ROLE_RU: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};
const WS_TYPE_RU: Record<string, string> = {
  print3d: "3D-печать", eva: "EVA", sewing: "Швейная", wigs: "Парики",
};

export type Social = { platform: string; handle: string };

export type Person = {
  id: number; user_id: number | null; display_name: string; city: string; experience: string;
  is_verified: boolean; available_for_work: boolean; is_pro: boolean;
  followers: number; looks: number; photo: string; specialization: string; bio: string;
  roles: string[]; role_details: Record<string, Record<string, any>>; socials: Social[];
  photos: { id: number; url: string }[];
  accent_color?: string;
  pinned_looks?: { id: number; title: string; character: string; image: string | null }[];
};

// Доступные соцсети: подпись, иконка-символ и база для ссылки (если ввели только ник).
export const SOCIAL_META: Record<string, { label: string; icon: string; base: string }> = {
  instagram: { label: "Instagram", icon: "◎", base: "https://instagram.com/" },
  tiktok:    { label: "TikTok",    icon: "♪", base: "https://tiktok.com/@" },
  vk:        { label: "VK",        icon: "✦", base: "https://vk.com/" },
  telegram:  { label: "Telegram",  icon: "✈", base: "https://t.me/" },
  youtube:   { label: "YouTube",   icon: "▷", base: "https://youtube.com/@" },
  twitter:   { label: "Twitter / X", icon: "✗", base: "https://x.com/" },
  discord:   { label: "Discord",   icon: "◈", base: "" },
  boosty:    { label: "Boosty",    icon: "❖", base: "https://boosty.to/" },
};

// Хэндл → полная ссылка. Если ввели готовый URL — отдаём как есть.
export function socialUrl(platform: string, handle: string): string {
  const h = (handle || "").trim();
  if (/^https?:\/\//i.test(h)) return h;
  const base = SOCIAL_META[platform]?.base ?? "";
  if (!base) return h;
  return base + h.replace(/^@/, "");
}

// Как показывать анкеты ролей (role_details) в публичных карточках/профиле.
// Ключи совпадают с ROLE_FORMS в кабинете.
export const ROLE_DETAIL_FIELDS: Record<string, { title: string; icon: string; fields: { key: string; label: string; suffix?: string }[] }> = {
  cosplayer: {
    title: "Косплеер", icon: "◉", fields: [
      { key: "amplua", label: "Амплуа" },
      { key: "fandoms", label: "Фандомы" },
      { key: "level", label: "Уровень" },
      { key: "open_collab", label: "Открыт к коллабам" },
    ],
  },
  photographer: {
    title: "Фотограф", icon: "◐", fields: [
      { key: "shoot_types", label: "Тип съёмки" },
      { key: "price_hour", label: "Стоимость", suffix: " ₸/час" },
      { key: "gear", label: "Оборудование" },
      { key: "portfolio_url", label: "Портфолио" },
    ],
  },
  shop: {
    title: "Магазин", icon: "⌂", fields: [
      { key: "shop_name", label: "Название" },
      { key: "sells", label: "Ассортимент" },
      { key: "contact", label: "Контакт" },
      { key: "delivery_cis", label: "Доставка по СНГ" },
    ],
  },
  location: {
    title: "Локация", icon: "⌖", fields: [
      { key: "loc_type", label: "Тип" },
      { key: "price_hour", label: "Цена", suffix: " ₸/час" },
      { key: "capacity", label: "Вместимость" },
      { key: "amenities", label: "Удобства" },
      { key: "loc_instagram", label: "Instagram" },
      { key: "loc_tiktok", label: "TikTok" },
      { key: "loc_whatsapp", label: "WhatsApp" },
      { key: "loc_site", label: "Сайт / 2GIS" },
    ],
  },
  fan: {
    title: "Фанат", icon: "♥", fields: [
      { key: "fandoms", label: "Любимые фандомы" },
      { key: "hobbies", label: "Хобби" },
    ],
  },
};

// Превращает значение поля анкеты в строку для показа ("" → пропустить).
export function fmtDetailValue(v: any, suffix = ""): string {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "boolean") return v ? "Да" : "";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "";
  return `${v}${suffix}`;
}

export type Shop = {
  id: number; name: string; type: string; city: string; is_pro: boolean;
  rating: number; orders: number; eta: string; cover: string; description: string;
  services: { id: number; name: string; description: string; price_from: number }[];
  reviews_count: number;
  photos: { id: number; url: string }[];
};

export type WorkshopReview = {
  id: number; rating: number; text: string; author_username: string; created_at: string;
};

export function normalizeProfile(p: any): Person {
  const roles: string[] = Array.isArray(p.roles) ? p.roles : [];
  return {
    id: p.id,
    user_id: p.user_id ?? null,
    display_name: p.display_name || p.username || "Без имени",
    city: p.city || "—",
    experience: p.experience || "—",
    is_verified: !!p.is_verified,
    available_for_work: !!p.available_for_work,
    is_pro: false,
    followers: p.followers_count ?? 0,
    looks: p.looks_count ?? 0,
    photo: p.avatar || PLACEHOLDER_PERSON,
    specialization: roles.map((r) => ROLE_RU[r] || r).join(" · ") || "Косплеер",
    bio: p.bio || "",
    roles,
    role_details: (p.role_details && typeof p.role_details === "object") ? p.role_details : {},
    socials: Array.isArray(p.socials)
      ? p.socials.filter((s: any) => s && s.platform && s.handle).map((s: any) => ({ platform: s.platform, handle: s.handle }))
      : [],
    photos: Array.isArray(p.photos)
      ? p.photos.filter((ph: any) => ph && ph.url).map((ph: any) => ({ id: ph.id, url: ph.url }))
      : [],
    accent_color: p.accent_color || undefined,
    pinned_looks: Array.isArray(p.pinned_looks) ? p.pinned_looks : [],
  };
}

export function normalizeWorkshop(w: any): Shop {
  return {
    id: w.id,
    name: w.name,
    type: WS_TYPE_RU[w.type] || w.type,
    city: w.city || "—",
    is_pro: !!w.is_pro,
    rating: Number(w.rating) || 0,
    orders: w.orders_count ?? 0,
    eta: w.eta || "—",
    cover: w.cover || PLACEHOLDER_WS,
    description: w.about || "",
    services: Array.isArray(w.services) ? w.services : [],
    reviews_count: w.reviews_count ?? 0,
    photos: Array.isArray(w.photos) ? w.photos : [],
  };
}

async function get(path: string) {
  try {
    const res = await fetch(`${base()}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getProfiles(query = ""): Promise<Person[] | null> {
  const data = await get(`/profiles/${query}`);
  if (!data) return null;
  const list = data.results ?? data;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map(normalizeProfile);
}

export async function getProfile(id: string | number): Promise<Person | null> {
  const data = await get(`/profiles/${id}/`);
  return data ? normalizeProfile(data) : null;
}

export async function getWorkshops(query = ""): Promise<Shop[] | null> {
  const data = await get(`/workshops/${query}`);
  if (!data) return null;
  const list = data.results ?? data;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map(normalizeWorkshop);
}

export async function getWorkshop(id: string | number): Promise<Shop | null> {
  const data = await get(`/workshops/${id}/`);
  return data ? normalizeWorkshop(data) : null;
}

export async function getWorkshopReviews(id: string | number): Promise<WorkshopReview[]> {
  const data = await get(`/workshops/${id}/reviews/`);
  return Array.isArray(data) ? data : [];
}

export type NewsItem = {
  id: number; title: string; body: string; image: string | null;
  is_pinned: boolean; author_name: string; created_at: string;
};

export async function getNews(): Promise<NewsItem[] | null> {
  const data = await get(`/news/`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export type EventItem = {
  id: number; title: string; description: string; city: string; place: string;
  date: string; cover: string | null; going: number; day: number | string; month: string;
  going_total: number; is_going: boolean;
  attendees: { user_id: number; username: string }[];
};

export async function getEvents(): Promise<EventItem[] | null> {
  const data = await get(`/events/`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getEvent(id: string | number): Promise<EventItem | null> {
  const data = await get(`/events/${id}/`);
  return data && data.id ? data : null;
}

export type GuideItem = {
  id: number; title: string; summary: string; body: string; category: string;
  cover: string | null; author_name: string; author_id: number | null; created_at: string;
  photos: { id: number; url: string }[];
};

export async function getGuides(): Promise<GuideItem[] | null> {
  const data = await get(`/guides/`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getGuide(id: string | number): Promise<GuideItem | null> {
  const data = await get(`/guides/${id}/`);
  return data && data.id ? data : null;
}

export type LookItem = {
  id: number; title: string; character: string; description: string; image: string | null;
  is_published: boolean; author_name: string; author_id: number | null;
  stage?: string; stage_display?: string;
  likes_count: number; is_liked: boolean; created_at: string;
};

export const LOOK_STAGE_RU: Record<string, string> = {
  planned: "Хочу скосплеить", wip: "В работе", done: "Готов",
};

export async function getLooks(query = ""): Promise<LookItem[] | null> {
  const data = await get(`/looks/${query}`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getLook(id: string | number): Promise<any | null> {
  const data = await get(`/looks/${id}/`);
  return data && data.id ? data : null;
}

// Опубликованные образы конкретного автора (user_id) — для страницы профиля.
export async function getLooksByAuthor(userId: number): Promise<LookItem[]> {
  const data = await get(`/looks/?author=${userId}`);
  if (!data) return [];
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export type TeamListItem = {
  id: number; name: string; city: string; avatar: string | null; cover: string | null;
  is_open: boolean; members_count: number; likes_count: number;
};

export async function getTeams(): Promise<TeamListItem[] | null> {
  const data = await get(`/teams/`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getTeam(id: string | number): Promise<any | null> {
  const data = await get(`/teams/${id}/`);
  return data && data.id ? data : null;
}

// ── Съёмки (сбор команды) ──
export const SHOOT_ROLES: { key: string; label: string }[] = [
  { key: "cosplayer", label: "Косплеер" },
  { key: "photographer", label: "Фотограф" },
  { key: "model", label: "Модель" },
  { key: "location", label: "Локация" },
  { key: "workshop", label: "Мастерская" },
  { key: "other", label: "Другое" },
];
export const SHOOT_ROLE_RU: Record<string, string> =
  Object.fromEntries(SHOOT_ROLES.map((r) => [r.key, r.label]));
export const SHOOT_STATUS_RU: Record<string, string> = {
  open: "Набор открыт", full: "Команда собрана", done: "Прошла", cancelled: "Отменена",
};

export type ShootListItem = {
  id: number; title: string; city: string; date: string | null; status: string;
  status_display: string; cover: string | null; looking_for: string[];
  organizer: { username: string; profile_id: number | null; avatar: string | null };
  confirmed_count: number;
};

export async function getShoots(query = ""): Promise<ShootListItem[] | null> {
  const data = await get(`/shoots/${query}`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getShoot(id: string | number): Promise<any | null> {
  const data = await get(`/shoots/${id}/`);
  return data && data.id ? data : null;
}

// ── Прокат костюмов ──
export const RENTAL_STATUS_RU: Record<string, string> = {
  pending: "Заявка", approved: "Подтверждена", declined: "Отклонена", cancelled: "Отменена",
};
export const COSTUME_STATUS_RU: Record<string, string> = {
  available: "Свободен", rented: "В аренде", unavailable: "Недоступен",
};

export type CostumeListItem = {
  id: number; title: string; character: string; city: string; size: string;
  price_day: number | null; deposit: number | null; image: string | null;
  status: string; status_display: string;
  owner_name: string; owner_profile_id: number | null;
};

export async function getCostumes(query = ""): Promise<CostumeListItem[] | null> {
  const data = await get(`/costumes/${query}`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getCostume(id: string | number): Promise<any | null> {
  const data = await get(`/costumes/${id}/`);
  return data && data.id ? data : null;
}

// ── Косплей-баттлы ──
export const BATTLE_STATUS_RU: Record<string, string> = {
  upcoming: "Скоро", voting: "Идёт голосование", finished: "Завершён",
};

export type BattleListItem = {
  id: number; title: string; theme: string; cover: string | null;
  status: string; status_display: string; entries_count: number;
  starts_at: string | null; ends_at: string | null;
};

export async function getBattles(query = ""): Promise<BattleListItem[] | null> {
  const data = await get(`/battles/${query}`);
  if (!data) return null;
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getBattle(id: string | number): Promise<any | null> {
  const data = await get(`/battles/${id}/`);
  return data && data.id ? data : null;
}

// ── Товары магазина (витрина продавца) ──
export type Product = {
  id: number; title: string; description: string; price: number | null;
  image: string | null; image_url: string; category: string;
  status: string; status_display: string; is_active: boolean;
  owner_name: string; owner_id: number; created_at: string;
};

export async function getProductsByOwner(userId: number): Promise<Product[]> {
  const data = await get(`/products/?owner=${userId}`);
  if (!data) return [];
  const list = data.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function getProduct(id: string | number): Promise<Product | null> {
  const data = await get(`/products/${id}/`);
  return data && data.id ? data : null;
}

export const PRODUCT_STATUS_META: Record<string, { label: string; color: string }> = {
  in_stock: { label: "В наличии", color: "var(--green)" },
  on_order: { label: "На заказ", color: "var(--accent-3)" },
  sold: { label: "Продано", color: "var(--ink-dim)" },
};

export function fmtPrice(price: number | null): string {
  return price == null ? "Цена по запросу" : `${price.toLocaleString("ru-RU")} ₸`;
}

export type PublicListing = {
  id: number; title: string; description: string; type: string; type_display: string;
  city: string; price: number | null; contact?: string; owner: string; owner_id: number; created_at: string;
};

export async function getPublicListings(types = ""): Promise<PublicListing[] | null> {
  const data = await get(`/listings/public/${types ? `?types=${types}` : ""}`);
  return Array.isArray(data) ? data : (data ? [] : null);
}

// Каталоги магазинов/локаций = профили с соответствующей ролью.
export async function getProfilesByRole(role: string): Promise<Person[] | null> {
  const data = await get(`/profiles/?role=${role}`);
  if (!data) return null;
  const list = data.results ?? data;
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProfile);
}

// ── Навигационная статистика (выпадающие меню в шапке) ──────────────────────
export type NavStats = {
  cosplayer_profiles: number; photographers: number; looks: number; teams: number;
  workshops: number; shops: number; jobs: number; locations: number;
  events: number; guides: number; market: number;
};

export async function getNavStats(): Promise<NavStats | null> {
  return await get(`/stats/`);
}

// Компактный счётчик: до 1000 — как есть, дальше «1.2k» (без хвоста «.0»).
export function fmtCount(n: number): string {
  const num = Number(n) || 0;
  if (num < 1000) return String(num);
  return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
}

// Русское число + склонение: pl(5, ["анкета","анкеты","анкет"]) → "5 анкет".
export function pl(n: number, forms: [string, string, string]): string {
  const num = Number(n) || 0;
  const n10 = num % 10, n100 = num % 100;
  let form: string;
  if (n10 === 1 && n100 !== 11) form = forms[0];
  else if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) form = forms[1];
  else form = forms[2];
  const pretty = num.toLocaleString("ru-RU").replace(/,/g, " ");
  return `${pretty} ${form}`;
}
