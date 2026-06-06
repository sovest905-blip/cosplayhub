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

export type Person = {
  id: number; user_id: number | null; display_name: string; city: string; experience: string;
  is_verified: boolean; available_for_work: boolean; is_pro: boolean;
  followers: number; looks: number; photo: string; specialization: string; bio: string;
  roles: string[]; role_details: Record<string, Record<string, any>>;
};

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
    followers: 0,
    looks: 0,
    photo: p.avatar || PLACEHOLDER_PERSON,
    specialization: roles.map((r) => ROLE_RU[r] || r).join(" · ") || "Косплеер",
    bio: p.bio || "",
    roles,
    role_details: (p.role_details && typeof p.role_details === "object") ? p.role_details : {},
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

// Каталоги магазинов/локаций = профили с соответствующей ролью.
export async function getProfilesByRole(role: string): Promise<Person[] | null> {
  const data = await get(`/profiles/?role=${role}`);
  if (!data) return null;
  const list = data.results ?? data;
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProfile);
}
