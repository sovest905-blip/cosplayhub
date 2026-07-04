"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SOCIAL_META, DONATION_KINDS, DONATION_KIND_META } from "../../lib/api";
import { ROLE_FORMS, RoleFields, galleryLimit } from "../../lib/roleForms";
import MessagesPanel from "../components/MessagesPanel";
import CryptoPayButton from "../components/CryptoPayButton";

const ROLE_MAP: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Бишкек", "Ташкент", "Москва", "Другой"];

// Селект города с поддержкой «Другой» → текстовое поле для ручного ввода.
// value — реальное название города (для «Другой» хранится введённый текст, а не слово «Другой»).
function CitySelect({ value, onChange, emptyLabel = "Не выбран" }: {
  value: string; onChange: (v: string) => void; emptyLabel?: string;
}) {
  const [other, setOther] = useState(!!value && !CITIES.includes(value));
  // город подгрузился извне и его нет в списке → включаем ручной ввод
  useEffect(() => { if (value && !CITIES.includes(value)) setOther(true); }, [value]);
  return (
    <>
      <select
        value={other ? "Другой" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "Другой") { setOther(true); onChange(""); }
          else { setOther(false); onChange(v); }
        }}
      >
        <option value="">{emptyLabel}</option>
        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {other && (
        <input style={{ marginTop: 8 }} value={value} placeholder="Введите название города"
          onChange={(e) => onChange(e.target.value)} />
      )}
    </>
  );
}

const ALL_ROLES = [
  { slug: "cosplayer",    icon: "◉", name: "Косплеер",   desc: "Создаёшь образы"  },
  { slug: "photographer", icon: "◐", name: "Фотограф",   desc: "Снимаешь"          },
  { slug: "workshop",     icon: "◆", name: "Мастерская", desc: "Шьёшь, печатаешь" },
  { slug: "shop",         icon: "⌂", name: "Магазин",    desc: "Продаёшь товары"  },
  { slug: "location",     icon: "⌖", name: "Локация",    desc: "Сдаёшь студию"    },
  { slug: "fan",          icon: "♥", name: "Фанат",      desc: "Смотришь"          },
];

const LISTING_TYPES: Record<string, string> = {
  job: "Ищу специалиста", collab: "Коллаборация", sell: "Продаю", buy: "Куплю",
};

// Куда попадёт объявление в зависимости от типа (для подсказок юзеру).
const LISTING_SECTION: Record<string, { name: string; href: string }> = {
  sell:   { name: "Барахолка", href: "/market" },
  buy:    { name: "Барахолка", href: "/market" },
  job:    { name: "Слоты", href: "/jobs" },
  collab: { name: "Слоты", href: "/jobs" },
};

const WORKSHOP_TYPES: Record<string, string> = {
  print3d: "3D-печать", eva: "EVA-броня", sewing: "Пошив", wigs: "Парики",
};

// Анкеты ролей: появляются под сеткой ролей при выборе роли.
// Конфиг и рендер полей — общие с админ-панелью (lib/roleForms).
// workshop — отдельная сущность (своя форма ниже), без анкеты в ROLE_FORMS.

type WsService = { name: string; price_from: string };
type Workshop = {
  id: number; name: string; type: string; city: string; about: string;
  eta: string; rating: number; orders_count: number; is_pro: boolean;
  services: { id: number; name: string; description: string; price_from: number }[];
  photos: { id: number; url: string }[];
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  request: "var(--accent-2)", accepted: "var(--green)", in_work: "var(--accent-3)",
  shipped: "#7cf9ff", done: "var(--green)", cancelled: "var(--ink-dim)",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  request: "Заявка", accepted: "Принят", in_work: "В работе",
  shipped: "Отправлен", done: "Получен", cancelled: "Отменён",
};

type MyOrder = {
  id: number; workshop: number; workshop_name: string; description: string;
  budget: number | null; deadline: string | null; status: string; has_review?: boolean;
  created_at: string;
};

type IncomingOrder = {
  id: number; workshop_name: string; customer_username: string;
  description: string; budget: number | null; status: string; status_display: string;
  created_at: string;
};

type Listing = {
  id: number; title: string; description: string; type: string;
  city: string; price: number | null; contact: string; is_active: boolean; created_at: string;
};

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [msgTo, setMsgTo] = useState<string | null>(null);
  const [msgListing, setMsgListing] = useState<string | null>(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [me, setMe] = useState<any>(null);
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({ username: "", city: "", experience: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);
  const [roleDetails, setRoleDetails] = useState<Record<string, Record<string, any>>>({});
  const [rdSaving, setRdSaving] = useState<string | null>(null);
  const [rdSaved, setRdSaved] = useState<string | null>(null);
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [socialsSaving, setSocialsSaving] = useState(false);
  const [socialsSaved, setSocialsSaved] = useState(false);
  const [photos, setPhotos] = useState<{ id: number; url: string }[]>([]);
  const [photoUp, setPhotoUp] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [myLooks, setMyLooks] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [lookForm, setLookForm] = useState({ title: "", character: "", team: "", stage: "done" });
  const [lookImg, setLookImg] = useState<File | null>(null);
  const [lookUp, setLookUp] = useState(false);
  const [lookErr, setLookErr] = useState("");
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [prodForm, setProdForm] = useState({ title: "", price: "", category: "", status: "in_stock", description: "" });
  const [prodImg, setProdImg] = useState<File | null>(null);
  const [prodUp, setProdUp] = useState(false);
  const [prodErr, setProdErr] = useState("");
  const [mySlots, setMySlots] = useState<any[]>([]);
  const [slotForm, setSlotForm] = useState({ title: "", date: "", time_start: "", time_end: "", price: "" });
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotErr, setSlotErr] = useState("");
  // Единомышленники (матчинг фаната)
  const [matches, setMatches] = useState<any[] | null>(null);
  const [matchesReady, setMatchesReady] = useState(true);
  // Настройки: смена пароля
  const [pwForm, setPwForm] = useState({ current: "", next: "", repeat: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Настройки: удаление аккаунта
  const [delPw, setDelPw] = useState("");
  const [delConfirm, setDelConfirm] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState("");
  // Настройки: смена email (2 шага — новый адрес → код)
  const [emStep, setEmStep] = useState<0 | 1 | 2>(0); // 0 закрыто, 1 ввод email, 2 ввод кода
  const [emNew, setEmNew] = useState("");
  const [emCode, setEmCode] = useState("");
  const [emBusy, setEmBusy] = useState(false);
  const [emMsg, setEmMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [availForWork, setAvailForWork] = useState(false);
  // Pro-кастомизация (1.4/1.6)
  const [custSlug, setCustSlug] = useState("");
  const [custAccent, setCustAccent] = useState("#ff2d6f");
  const [custHide, setCustHide] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [donMethods, setDonMethods] = useState<{ kind: string; address: string }[]>([]);
  const [donDraft, setDonDraft] = useState({ kind: "usdt_trc20", address: "" });
  const [custMsg, setCustMsg] = useState("");
  const [acceptMessages, setAcceptMessages] = useState(true);
  const [ordersCount, setOrdersCount] = useState(0);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  // События, куда пользователь отметился «Пойду» — блок «Скоро у вас» на обзоре
  const [myEvents, setMyEvents] = useState<{ id: number; title: string; city: string; place: string; date: string; day: number | string; month: string; going_total: number }[]>([]);
  // Аналитика (Pro): null=не загружено, {pro:false}=апселл, иначе данные
  const [analytics, setAnalytics] = useState<any>(null);
  const [viewers, setViewers] = useState<any>(null);
  const [myShoots, setMyShoots] = useState<{ organized: any[]; participating: any[] } | null>(null);
  const [myCostumes, setMyCostumes] = useState<any[] | null>(null);
  const [myRentals, setMyRentals] = useState<any[] | null>(null);
  // Отзыв о мастерской по завершённому заказу
  const [reviewFor, setReviewFor] = useState<number | null>(null);
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState("");
  const [revBusy, setRevBusy] = useState(false);
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingForm, setListingForm] = useState({ title: "", type: "", city: "", description: "", price: "", contact: "" });
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingSaving, setListingSaving] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  // Под-вкладка раздела «Объявления»: мои или общие (все публичные).
  const [listingScope, setListingScope] = useState<"mine" | "all">("mine");
  const [publicListings, setPublicListings] = useState<any[] | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState<"avatar" | "cover" | null>(null);
  const [following, setFollowing] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [activating, setActivating] = useState<string | null>(null);
  const [showWsForm, setShowWsForm] = useState(false);
  const [wsSaving, setWsSaving] = useState(false);
  const [wsErr, setWsErr] = useState("");
  const [wsForm, setWsForm] = useState<{
    name: string; type: string; city: string; eta: string; about: string; services: WsService[];
  }>({ name: "", type: "print3d", city: "", eta: "", about: "", services: [{ name: "", price_from: "" }] });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTab(params.get("tab") || "dashboard");
    if (params.get("to")) setMsgTo(params.get("to"));
    if (params.get("listing")) setMsgListing(params.get("listing"));
    if (params.get("new") === "workshop") {
      setTab("roles");
      setShowWsForm(true);
    }
  }, []);

  // Счётчик непрочитанных для бейджа вкладки «Сообщения» (до её открытия).
  useEffect(() => {
    fetch("/api/v1/conversations/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => Array.isArray(list)
        ? setUnreadMsgs(list.reduce((s: number, c: any) => s + (c.unread || 0), 0))
        : null)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/v1/auth/me/`, { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login"); return null; } return r.json(); })
      .then((data) => {
        if (cancelled || !data) return;
        setMe(data);
        setForm({ username: data.username || "", city: data.city || "", experience: data.experience || "", bio: data.bio || "" });
        const loadedRoles: string[] = data.roles || [];
        // заход с каталога «Создать мастерскую» — гарантируем роль workshop
        if (new URLSearchParams(window.location.search).get("new") === "workshop" && !loadedRoles.includes("workshop")) {
          const next = [...loadedRoles, "workshop"];
          setRoles(next);
          patchProfile({ roles: next });
        } else {
          setRoles(loadedRoles);
        }
        setRoleDetails(data.role_details || {});
        const soc: Record<string, string> = {};
        (Array.isArray(data.socials) ? data.socials : []).forEach((s: any) => {
          if (s && s.platform) soc[s.platform] = s.handle || "";
        });
        setSocials(soc);
        setAvailForWork(!!data.available_for_work);
        setAcceptMessages(data.accept_messages !== false);
        setAvatarUrl(data.avatar || null);
        setCoverUrl(data.cover || null);
        setCustSlug(data.slug || "");
        setCustAccent(data.accent_color || "#ff2d6f");
        setCustHide(!!data.hide_from_catalog);
        setPinnedIds(Array.isArray(data.pinned_look_ids) ? data.pinned_look_ids : []);
        setDonMethods(Array.isArray(data.donation_methods) ? data.donation_methods : []);
        setAuthed(true);
      })
      .catch(() => router.replace("/auth/login"));

    fetch(`/api/v1/orders/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const list = data.results ?? data;
        if (Array.isArray(list)) { setMyOrders(list); setOrdersCount(list.length); }
      }).catch(() => {});

    fetch(`/api/v1/events/mine/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && Array.isArray(data)) setMyEvents(data); }).catch(() => {});

    fetch(`/api/v1/analytics/me/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setAnalytics(data); }).catch(() => {});

    fetch(`/api/v1/profiles/me/viewers/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setViewers(data); }).catch(() => {});

    fetch(`/api/v1/shoots/mine/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setMyShoots(data); }).catch(() => {});

    fetch(`/api/v1/costumes/?mine=1`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { const l = data?.results ?? data; if (!cancelled && Array.isArray(l)) setMyCostumes(l); }).catch(() => {});

    fetch(`/api/v1/rentals/mine/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && Array.isArray(data)) setMyRentals(data); }).catch(() => {});

    fetch(`/api/v1/orders/incoming/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setIncomingOrders(data);
      }).catch(() => {});

    fetch(`/api/v1/listings/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const list = data.results ?? data;
        setListings(Array.isArray(list) ? list : []);
      }).catch(() => {});

    fetch(`/api/v1/follow/following/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && Array.isArray(data)) setFollowing(data); }).catch(() => {});

    fetch(`/api/v1/follow/followers/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && Array.isArray(data)) setFollowersCount(data.length); }).catch(() => {});

    fetch(`/api/v1/favorites/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && Array.isArray(data)) setFavorites(data); }).catch(() => {});

    fetch(`/api/v1/profiles/me/photos/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && Array.isArray(data)) setPhotos(data); }).catch(() => {});

    fetch(`/api/v1/looks/?mine=1`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return;
        const list = data?.results ?? data;
        if (Array.isArray(list)) setMyLooks(list);
      }).catch(() => {});

    fetch(`/api/v1/products/?mine=1`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return;
        const list = data?.results ?? data;
        if (Array.isArray(list)) setMyProducts(list);
      }).catch(() => {});

    fetch(`/api/v1/slots/?mine=1`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return;
        const list = data?.results ?? data;
        if (Array.isArray(list)) setMySlots(list);
      }).catch(() => {});

    fetch(`/api/v1/teams/?mine=1`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return;
        const list = data?.results ?? data;
        if (Array.isArray(list)) setMyTeams(list);
      }).catch(() => {});

    fetch(`/api/v1/workshops/mine/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const list = data.results ?? data;
        setWorkshops(Array.isArray(list) ? list : []);
      }).catch(() => {});

    return () => { cancelled = true; };
  }, [router]);

  function goTab(id: string) {
    setTab(id);
    window.history.pushState({}, "", `/cabinet?tab=${id}`);
  }

  // Активировать единый Pro (6 мес бесплатно). Покрывает профиль и все мастерские.
  async function activatePlan() {
    setActivating("pro");
    try {
      const res = await fetch("/api/v1/billing/activate/", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ plan: "pro" }),
      });
      if (res.ok) {
        const meR = await fetch("/api/v1/auth/me/", { credentials: "include" }).then((r) => r.ok ? r.json() : null);
        if (meR) setMe(meR);
        // Pro покрывает мастерские — обновим их статусы (is_pro).
        fetch("/api/v1/workshops/mine/", { credentials: "include" })
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { const l = d?.results ?? d; if (Array.isArray(l)) setWorkshops(l); });
      } else {
        const e = await res.json().catch(() => ({}));
        alert(e.detail || "Не удалось активировать");
      }
    } finally {
      setActivating(null);
    }
  }

  function openWorkshopForm() {
    setWsErr("");
    setShowWsForm(true);
    if (!roles.includes("workshop")) {
      const next = [...roles, "workshop"];
      setRoles(next);
      patchProfile({ roles: next });
    }
    goTab("roles");
  }

  async function saveBasics() {
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      const res = await fetch(`/api/v1/auth/me/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.username?.[0] || data.detail || "Не удалось сохранить");
      setMe(data); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setSaving(false); }
  }

  async function toggleRole(slug: string) {
    const next = roles.includes(slug) ? roles.filter((r) => r !== slug) : [...roles, slug];
    setRoles(next); setRolesLoading(true); setRolesSaved(false);
    try {
      await fetch(`/api/v1/auth/me/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ roles: next }),
      });
      setRolesSaved(true);
      setTimeout(() => setRolesSaved(false), 2000);
    } finally { setRolesLoading(false); }
  }

  function setRoleField(role: string, key: string, value: any) {
    setRoleDetails((prev) => ({ ...prev, [role]: { ...(prev[role] || {}), [key]: value } }));
  }

  async function saveRoleDetails(role: string) {
    setRdSaving(role); setRdSaved(null);
    try {
      const res = await fetch(`/api/v1/auth/me/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ role_details: roleDetails }),
      });
      if (res.ok) {
        setRdSaved(role);
        setTimeout(() => setRdSaved(null), 2000);
      }
    } finally { setRdSaving(null); }
  }

  async function saveSocials() {
    setSocialsSaving(true); setSocialsSaved(false);
    try {
      const list = Object.entries(socials)
        .map(([platform, handle]) => ({ platform, handle: (handle || "").trim() }))
        .filter((s) => s.handle);
      const res = await fetch(`/api/v1/auth/me/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ socials: list }),
      });
      if (res.ok) {
        setSocialsSaved(true);
        setTimeout(() => setSocialsSaved(false), 2500);
      }
    } finally { setSocialsSaving(false); }
  }

  async function patchProfile(patch: Record<string, unknown>) {
    await fetch(`/api/v1/auth/me/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(patch),
    });
  }

  function togglePin(id: number) {
    setPinnedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : (prev.length >= 3 ? prev : [...prev, id]));
  }

  async function saveCustomization() {
    setCustMsg("");
    const res = await fetch(`/api/v1/auth/me/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ slug: custSlug, accent_color: custAccent, hide_from_catalog: custHide, pinned_look_ids: pinnedIds, donation_methods: donMethods }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setMe(data); setCustSlug(data.slug || ""); setDonMethods(Array.isArray(data.donation_methods) ? data.donation_methods : []); setCustMsg("Сохранено ✓"); setTimeout(() => setCustMsg(""), 2500); }
    else { setCustMsg(data.slug?.[0] || data.detail || "Не удалось сохранить"); }
  }

  async function submitReview(orderId: number) {
    setRevBusy(true);
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/review/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ rating: revRating, text: revText }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMyOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, has_review: true } : o));
        setReviewFor(null); setRevText(""); setRevRating(5);
      } else alert(data.detail || "Не удалось отправить отзыв");
    } finally { setRevBusy(false); }
  }

  async function updateIncomingStatus(orderId: number, newStatus: string) {
    const res = await fetch(`/api/v1/orders/incoming/${orderId}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setIncomingOrders((prev) => prev.map((o) => o.id === orderId ? updated : o));
    }
  }

  async function createListing() {
    // Обязательны: тип (куда распределить), город и заголовок.
    if (!listingForm.title.trim() || !listingForm.type || !listingForm.city) return;
    setListingSaving(true);
    try {
      const editing = editingListingId !== null;
      const res = await fetch(editing ? `/api/v1/listings/${editingListingId}/` : `/api/v1/listings/`, {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: listingForm.title,
          type: listingForm.type,
          city: listingForm.city,
          description: listingForm.description,
          price: listingForm.price ? parseInt(listingForm.price) : null,
          contact: listingForm.contact,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setListings((prev) => editing ? prev.map((l) => l.id === editingListingId ? data : l) : [data, ...prev]);
        setListingForm({ title: "", type: "", city: "", description: "", price: "", contact: "" });
        setShowListingForm(false);
        setEditingListingId(null);
      }
    } finally { setListingSaving(false); }
  }

  // Открыть форму на редактирование объявления (заполнить полями).
  function startEditListing(listing: Listing) {
    setEditingListingId(listing.id);
    setListingForm({
      title: listing.title || "",
      type: listing.type || "job",
      city: listing.city || "",
      description: listing.description || "",
      price: listing.price != null ? String(listing.price) : "",
      contact: listing.contact || "",
    });
    setShowListingForm(true);
  }

  // Сброс формы (отмена создания/редактирования).
  function cancelListingForm() {
    setShowListingForm(false);
    setEditingListingId(null);
    setListingForm({ title: "", type: "", city: "", description: "", price: "", contact: "" });
  }

  async function toggleListingActive(id: number, current: boolean) {
    const res = await fetch(`/api/v1/listings/${id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      const updated = await res.json();
      setListings((prev) => prev.map((l) => l.id === id ? updated : l));
    }
  }

  async function uploadPhoto(kind: "avatar" | "cover", file: File) {
    setPhotoUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/auth/${kind}/`, {
        method: "POST", credentials: "include", body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        if (kind === "avatar") setAvatarUrl(data.url);
        else setCoverUrl(data.url);
      }
    } finally {
      setPhotoUploading(null);
    }
  }

  async function deletePhoto(kind: "avatar" | "cover") {
    setPhotoUploading(kind);
    try {
      await fetch(`/api/v1/auth/${kind}/`, { method: "DELETE", credentials: "include" });
      if (kind === "avatar") setAvatarUrl(null);
      else setCoverUrl(null);
    } finally {
      setPhotoUploading(null);
    }
  }

  async function deleteListing(id: number) {
    const res = await fetch(`/api/v1/listings/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
  }

  // Переключение под-вкладки. «Общие» подгружаем один раз (лениво).
  function switchListingScope(scope: "mine" | "all") {
    setListingScope(scope);
    if (scope === "all" && publicListings === null) {
      fetch(`/api/v1/listings/public/`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setPublicListings(Array.isArray(d) ? d : []))
        .catch(() => setPublicListings([]));
    }
  }

  async function uploadGalleryPhoto(file: File) {
    setPhotoErr("");
    const lim = galleryLimit(roles, user.is_pro);
    if (photos.length >= lim) { setPhotoErr(`Лимит ${lim} фото`); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoErr("Максимум 5 МБ"); return; }
    setPhotoUp(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/profiles/me/photos/`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPhotos((prev) => [...prev, data]);
      else setPhotoErr(data.detail || "Не удалось загрузить");
    } finally { setPhotoUp(false); }
  }

  async function deleteGalleryPhoto(id: number) {
    const res = await fetch(`/api/v1/profiles/me/photos/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function addLook() {
    setLookErr("");
    if (!lookForm.title.trim()) { setLookErr("Введите название образа"); return; }
    // Фото обязательно для готового образа; «Хочу скосплеить»/«В работе» можно без фото.
    if (lookForm.stage === "done" && !lookImg) { setLookErr("Добавьте фото готового образа"); return; }
    if (lookImg && lookImg.size > 5 * 1024 * 1024) { setLookErr("Максимум 5 МБ"); return; }
    setLookUp(true);
    try {
      const fd = new FormData();
      fd.append("title", lookForm.title);
      fd.append("character", lookForm.character);
      fd.append("stage", lookForm.stage);
      if (lookForm.team) fd.append("team", lookForm.team);
      if (lookImg) fd.append("image", lookImg);
      const res = await fetch(`/api/v1/looks/`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setMyLooks((prev) => [data, ...prev]); setLookForm({ title: "", character: "", team: "", stage: "done" }); setLookImg(null); }
      else setLookErr(data.detail || data.image?.[0] || "Не удалось");
    } finally { setLookUp(false); }
  }

  async function delLook(id: number) {
    const res = await fetch(`/api/v1/looks/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) setMyLooks((prev) => prev.filter((l) => l.id !== id));
  }

  async function addProduct() {
    setProdErr("");
    if (!prodForm.title.trim()) { setProdErr("Введите название товара"); return; }
    if (prodImg && prodImg.size > 5 * 1024 * 1024) { setProdErr("Фото максимум 5 МБ"); return; }
    setProdUp(true);
    try {
      const fd = new FormData();
      fd.append("title", prodForm.title);
      if (prodForm.price.trim()) fd.append("price", prodForm.price.replace(/\D/g, ""));
      fd.append("category", prodForm.category);
      fd.append("status", prodForm.status);
      fd.append("description", prodForm.description);
      if (prodImg) fd.append("image", prodImg);
      const res = await fetch(`/api/v1/products/`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMyProducts((prev) => [data, ...prev]);
        setProdForm({ title: "", price: "", category: "", status: "in_stock", description: "" });
        setProdImg(null);
      } else setProdErr(data.detail || data.image?.[0] || "Не удалось");
    } finally { setProdUp(false); }
  }

  async function delProduct(id: number) {
    const res = await fetch(`/api/v1/products/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) setMyProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function addSlot() {
    setSlotErr("");
    if (!slotForm.date || !slotForm.time_start || !slotForm.time_end) { setSlotErr("Укажи дату и время"); return; }
    setSlotSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: slotForm.title.trim(), date: slotForm.date,
        time_start: slotForm.time_start, time_end: slotForm.time_end,
      };
      const digits = slotForm.price.replace(/\D/g, "");
      if (digits) body.price = parseInt(digits, 10);
      const res = await fetch(`/api/v1/slots/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMySlots((prev) => [...prev, data]);
        setSlotForm({ title: "", date: "", time_start: "", time_end: "", price: "" });
      } else setSlotErr(data.detail || data.date?.[0] || data.time_start?.[0] || "Не удалось");
    } finally { setSlotSaving(false); }
  }

  async function delSlot(id: number) {
    if (!confirm("Удалить слот? Заявки на него тоже удалятся.")) return;
    const res = await fetch(`/api/v1/slots/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) setMySlots((prev) => prev.filter((s) => s.id !== id));
  }

  // Решение по заявке на бронь: бэкенд возвращает обновлённый слот (с заявками).
  async function decideBooking(bookingId: number, status: "approved" | "declined") {
    const res = await fetch(`/api/v1/bookings/${bookingId}/`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const slot = await res.json();
      setMySlots((prev) => prev.map((s) => (s.id === slot.id ? slot : s)));
    } else {
      const e = await res.json().catch(() => ({}));
      alert(e.detail || "Не удалось");
    }
  }

  async function createWorkshop() {
    if (!wsForm.name.trim() || !wsForm.city.trim()) {
      setWsErr("Заполни название и город"); return;
    }
    setWsSaving(true); setWsErr("");
    try {
      const services = wsForm.services
        .filter((s) => s.name.trim() && s.price_from)
        .map((s) => ({ name: s.name.trim(), price_from: parseInt(s.price_from) || 0 }));
      const res = await fetch(`/api/v1/workshops/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: wsForm.name.trim(), type: wsForm.type, city: wsForm.city.trim(),
          eta: wsForm.eta.trim(), about: wsForm.about.trim(), services,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.name?.[0] || data.detail || "Не удалось создать мастерскую");
      setWorkshops((prev) => [data, ...prev]);
      // роль workshop включаем автоматически
      if (!roles.includes("workshop")) {
        const next = [...roles, "workshop"];
        setRoles(next);
        patchProfile({ roles: next });
      }
      setWsForm({ name: "", type: "print3d", city: "", eta: "", about: "", services: [{ name: "", price_from: "" }] });
      setShowWsForm(false);
    } catch (e: unknown) {
      setWsErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setWsSaving(false); }
  }

  async function deleteWorkshop(id: number) {
    const res = await fetch(`/api/v1/workshops/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok) setWorkshops((prev) => prev.filter((w) => w.id !== id));
  }

  // Фото работ мастерской (портфолио, до 5 штук)
  async function uploadWsPhoto(wsId: number, file: File) {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(`/api/v1/workshops/${wsId}/photos/`, { method: "POST", credentials: "include", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setWorkshops((prev) => prev.map((w) => w.id === wsId ? { ...w, photos: [...(w.photos || []), data] } : w));
    } else alert(data.detail || "Не удалось загрузить фото");
  }

  async function deleteWsPhoto(wsId: number, photoId: number) {
    const res = await fetch(`/api/v1/workshops/${wsId}/photos/${photoId}/`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) {
      setWorkshops((prev) => prev.map((w) => w.id === wsId ? { ...w, photos: (w.photos || []).filter((p) => p.id !== photoId) } : w));
    }
  }

  async function unfollow(userId: number) {
    const res = await fetch(`/api/v1/follow/${userId}/`, { method: "DELETE", credentials: "include" });
    if (res.ok) setFollowing((prev) => prev.filter((p) => p.user_id !== userId));
  }

  async function removeFavorite(kind: string, objectId: number) {
    const res = await fetch(`/api/v1/favorites/${kind}/${objectId}/`, { method: "DELETE", credentials: "include" });
    if (res.ok) setFavorites((prev) => prev.filter((f) => !(f.kind === kind && f.item.id === objectId)));
  }

  // Единомышленники — грузим при первом открытии вкладки.
  useEffect(() => {
    if (tab !== "matches" || matches !== null) return;
    fetch("/api/v1/profiles/fan-matches/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setMatches(d.matches || []); setMatchesReady(d.ready !== false); } })
      .catch(() => setMatches([]));
  }, [tab, matches]);

  async function followMatch(userId: number) {
    const res = await fetch(`/api/v1/follow/${userId}/`, { method: "POST", credentials: "include" });
    if (res.ok) setMatches((prev) => prev?.map((m) => (m.user_id === userId ? { ...m, is_following: true } : m)) || null);
  }

  async function changePassword() {
    setPwMsg(null);
    if (pwForm.next !== pwForm.repeat) { setPwMsg({ ok: false, text: "Новый пароль и повтор не совпадают" }); return; }
    if (pwForm.next.length < 10) { setPwMsg({ ok: false, text: "Минимум 10 символов" }); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/v1/auth/change-password/", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setPwMsg({ ok: true, text: "Пароль изменён" }); setPwForm({ current: "", next: "", repeat: "" }); }
      else setPwMsg({ ok: false, text: data.detail || "Не удалось" });
    } finally { setPwSaving(false); }
  }

  async function requestEmailChange() {
    setEmMsg(null);
    if (!emNew.includes("@")) { setEmMsg({ ok: false, text: "Введите корректный email" }); return; }
    setEmBusy(true);
    try {
      const res = await fetch("/api/v1/auth/change-email/", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ new_email: emNew.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setEmStep(2); setEmMsg({ ok: true, text: "Код отправлен на новый адрес" }); }
      else setEmMsg({ ok: false, text: data.detail || "Не удалось" });
    } finally { setEmBusy(false); }
  }

  async function confirmEmailChange() {
    setEmMsg(null);
    setEmBusy(true);
    try {
      const res = await fetch("/api/v1/auth/change-email/confirm/", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ code: emCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMe((prev: any) => ({ ...prev, email: data.email }));
        setEmStep(0); setEmNew(""); setEmCode(""); setEmMsg(null);
      } else setEmMsg({ ok: false, text: data.detail || "Неверный код" });
    } finally { setEmBusy(false); }
  }

  async function deleteAccount() {
    setDelErr("");
    setDelBusy(true);
    try {
      const res = await fetch("/api/v1/auth/delete-account/", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ password: delPw }),
      });
      if (res.ok || res.status === 204) { window.location.href = "/"; return; }
      const data = await res.json().catch(() => ({}));
      setDelErr(data.detail || "Не удалось удалить");
    } finally { setDelBusy(false); }
  }

  if (!authed) return (
    <div className="wrap" style={{ paddingTop: 60, textAlign: "center", color: "var(--ink-dim)" }}>
      Загрузка...
    </div>
  );

  const user = {
    display_name: me.username || me.email?.split("@")[0] || me.phone || "Пользователь",
    photo: avatarUrl || null,
    is_pro: me.is_pro ?? false,
    pro_active_until: me.pro_active_until ?? null,
    city: me.city || "—",
    specialization: roles.length > 0 ? roles.map((r) => ROLE_MAP[r] || r).join(" · ") : "Фанат",
    experience: me.experience || "—",
    profile_id: me.profile_id ?? null,
  };

  const newIncoming = incomingOrders.filter((o) => o.status === "request").length;
  const activeListings = listings.filter((l) => l.is_active).length;
  // Лайки на контенте пользователя — с разбивкой по разделам (всё, что лайкается).
  const likesLooks = myLooks.reduce((s, l) => s + (Number(l.likes_count) || 0), 0);
  const likesTeams = myTeams.reduce((s, t) => s + (Number(t.likes_count) || 0), 0);
  const totalLikes = likesLooks + likesTeams;
  const likeBreakdown = [
    { label: "За образы", val: likesLooks, count: myLooks.length, icon: "✧" },
    { label: "За команды", val: likesTeams, count: myTeams.length, icon: "♛" },
  ];

  const shootInvites = (myShoots?.participating || []).filter((s) => s.my_participation?.status === "invited").length;
  const rentalReqCount = (myCostumes || []).reduce((n, c) => n + (c.requests || []).filter((r: any) => r.status === "pending").length, 0);

  const NAV_ITEMS = [
    { id: "dashboard", icon: "▤", label: "Обзор" },
    { id: "profile",   icon: "◉", label: "Профиль" },
    { id: "roles",     icon: "★", label: "Роли и услуги" },
    { id: "subs",      icon: "♛", label: "Подписки и доход" },
    { id: "analytics", icon: "📊", label: "Аналитика" },
    { id: "socials",   icon: "⌘", label: "Соцсети" },
    { id: "gallery",   icon: "▦", label: "Фотогалерея" },
    { id: "orders",    icon: "⚒", label: "Заказы",     num: ordersCount || undefined },
    { id: "responses", icon: "↗", label: "Отклики",    num: newIncoming || undefined },
    { id: "messages",  icon: "✉", label: "Сообщения",  num: unreadMsgs || undefined },
    { id: "favs",      icon: "♥", label: "Избранное" },
    { id: "shoots",    icon: "◎", label: "Мои съёмки", num: shootInvites || undefined },
    { id: "rent",      icon: "❖", label: "Прокат",     num: rentalReqCount || undefined },
    ...(roles.includes("fan") ? [{ id: "matches", icon: "❤", label: "Единомышленники" }] : []),
    { id: "listings",  icon: "⌂", label: "Объявления", num: activeListings || undefined },
    { id: "settings",  icon: "⚙", label: "Настройки" },
  ];

  function renderRoleForm(role: string) {
    const cfg = ROLE_FORMS[role];
    if (!cfg) return null;
    const vals = roleDetails[role] || {};
    return (
      <div key={role} style={{ marginTop: 16, padding: 16, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--accent-2)" }}>{cfg.icon}</span> {cfg.title}
          </h4>
          <span style={{ fontSize: 12, color: rdSaving === role ? "var(--ink-dim)" : "var(--green)",
            opacity: rdSaving === role || rdSaved === role ? 1 : 0, transition: "opacity .3s" }}>
            {rdSaving === role ? "Сохраняем..." : "✓ Сохранено"}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 14px" }}>{cfg.hint}</p>

        <RoleFields role={role} values={vals} onChange={(k, v) => setRoleField(role, k, v)} />

        <button className="btn btn-primary btn-sm" onClick={() => saveRoleDetails(role)} disabled={rdSaving === role}>
          {rdSaving === role ? "Сохраняем..." : "Сохранить анкету"}
        </button>

        {role === "shop" && productsBlock()}
        {role === "location" && slotsBlock()}
        {role === "location" && galleryBlock("Фотогалерея локации", "Покажи площадку: интерьер, свет, фоны.")}
        {role === "photographer" && !roles.includes("location") &&
          galleryBlock("Портфолио (фото)", "Покажи свои работы — лучшие кадры.")}
        {role === "cosplayer" && looksBlock()}
        {role === "cosplayer" && !roles.includes("location") && !roles.includes("photographer") &&
          galleryBlock("Фотогалерея", "Добавь до 15 фото своих образов и портретов.")}
      </div>
    );
  }

  // Блок «Мои образы» внутри анкеты косплеера. Образы видны в ленте /looks.
  function looksBlock() {
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>Мои образы</h4>
          <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{myLooks.length} в ленте</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>Покажи свои косплеи — они появятся в разделе «Образы» с лайками. «Хочу скосплеить» и «В работе» можно добавить без фото и вести прогресс.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px", marginBottom: 8 }}>
          <div className="field"><label>Название образа</label><input value={lookForm.title} onChange={(e) => setLookForm({ ...lookForm, title: e.target.value })} placeholder="Райден Сёгун" /></div>
          <div className="field"><label>Персонаж / фандом</label><input value={lookForm.character} onChange={(e) => setLookForm({ ...lookForm, character: e.target.value })} placeholder="Genshin Impact" /></div>
        </div>
        <div className="field"><label>Стадия</label>
          <select value={lookForm.stage} onChange={(e) => setLookForm({ ...lookForm, stage: e.target.value })}>
            <option value="done">Готов</option>
            <option value="wip">В работе</option>
            <option value="planned">Хочу скосплеить</option>
          </select>
        </div>
        {myTeams.length > 0 && (
          <div className="field"><label>Команда (необязательно)</label>
            <select value={lookForm.team} onChange={(e) => setLookForm({ ...lookForm, team: e.target.value })}>
              <option value="">— без команды —</option>
              {myTeams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
        )}
        <div className="field"><label>Фото образа</label><input type="file" accept="image/*" onChange={(e) => setLookImg(e.target.files?.[0] || null)} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={addLook} disabled={lookUp}>{lookUp ? "Загружаем…" : "+ Добавить образ"}</button>
          {lookErr && <span style={{ color: "var(--red)", fontSize: 12 }}>{lookErr}</span>}
        </div>
        {myLooks.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 10 }}>
            {myLooks.map((l) => (
              <div key={l.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
                <a href={`/looks/${l.id}`} title="Открыть прогресс">
                  <div style={{ aspectRatio: "3/4", backgroundSize: "cover", backgroundPosition: "center",
                    backgroundImage: `url('${l.image || "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=300&q=80"}')` }} />
                </a>
                {l.stage && l.stage !== "done" && (
                  <span style={{ position: "absolute", top: 4, left: 4, fontSize: 9, background: "rgba(0,0,0,.65)",
                    color: l.stage === "wip" ? "var(--accent-3)" : "var(--accent-2)", borderRadius: 10, padding: "2px 6px" }}>{l.stage_display}</span>
                )}
                <a href={`/looks/${l.id}`} style={{ display: "block", fontSize: 10, padding: "4px 6px", color: "var(--ink-dim)" }}>{l.title} · ♥ {l.likes_count}</a>
                <button onClick={() => delLook(l.id)} title="Удалить"
                  style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none",
                    background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Блок «Мои товары» внутри анкеты магазина. Товары видны на профиле и на странице товара.
  function productsBlock() {
    const ST = [["in_stock", "В наличии"], ["on_order", "На заказ"], ["sold", "Продано"]];
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>Мои товары</h4>
          <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{myProducts.length} в витрине</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>Товары появятся в витрине магазина на твоём профиле. Оплата — через личные сообщения (до подключения платежей).</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <div className="field"><label>Название</label><input value={prodForm.title} onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })} placeholder="Парик длинный, блонд" /></div>
          <div className="field"><label>Цена, ₸ (пусто = по запросу)</label><input value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} placeholder="9900" inputMode="numeric" /></div>
          <div className="field"><label>Категория (опц.)</label><input value={prodForm.category} onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })} placeholder="Парики" /></div>
          <div className="field"><label>Статус</label>
            <select value={prodForm.status} onChange={(e) => setProdForm({ ...prodForm, status: e.target.value })}>
              {ST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Описание</label><textarea rows={2} value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} placeholder="Материал, размер, состояние…" /></div>
        <div className="field"><label>Фото товара</label><input type="file" accept="image/*" onChange={(e) => setProdImg(e.target.files?.[0] || null)} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={addProduct} disabled={prodUp}>{prodUp ? "Сохраняем…" : "+ Добавить товар"}</button>
          {prodErr && <span style={{ color: "var(--red)", fontSize: 12 }}>{prodErr}</span>}
        </div>
        {myProducts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {myProducts.map((p) => (
              <div key={p.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
                <div style={{ aspectRatio: "1", backgroundSize: "cover", backgroundPosition: "center",
                  backgroundImage: `url('${p.image || p.image_url || "https://images.unsplash.com/photo-1513094735237-8f2714d57c13?w=300&q=80"}')` }} />
                <div style={{ fontSize: 10, padding: "4px 6px", color: "var(--ink-dim)" }}>
                  {p.title}<br />{p.price ? `${Number(p.price).toLocaleString("ru-RU")} ₸` : "по запросу"} · {p.status_display}
                </div>
                <button onClick={() => delProduct(p.id)} title="Удалить"
                  style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none",
                    background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Блок «Слоты аренды» внутри анкеты локации: слоты + заявки на бронь.
  function slotsBlock() {
    const fmtD = (d: string) => { try { return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }); } catch { return d; } };
    const fmtT = (t: string) => (t || "").slice(0, 5);
    const BOOK_STATUS: Record<string, [string, string]> = {
      pending: ["Заявка", "var(--accent-2)"], approved: ["Подтверждена", "var(--green)"],
      declined: ["Отклонена", "var(--ink-dim)"], cancelled: ["Отменена гостем", "var(--ink-dim)"],
    };
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>Слоты аренды</h4>
          <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{mySlots.length} всего</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>
          Опубликуй свободные окна — гости подают заявку, ты подтверждаешь. Оплата на месте или в ЛС (до подключения платежей).
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <div className="field"><label>Название (опц.)</label>
            <input value={slotForm.title} onChange={(e) => setSlotForm({ ...slotForm, title: e.target.value })} placeholder="Зал А, вечерний" /></div>
          <div className="field"><label>Дата</label>
            <input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} /></div>
          <div className="field"><label>С</label>
            <input type="time" value={slotForm.time_start} onChange={(e) => setSlotForm({ ...slotForm, time_start: e.target.value })} /></div>
          <div className="field"><label>До</label>
            <input type="time" value={slotForm.time_end} onChange={(e) => setSlotForm({ ...slotForm, time_end: e.target.value })} /></div>
        </div>
        <div className="field"><label>Цена, ₸ (пусто = договорная)</label>
          <input value={slotForm.price} onChange={(e) => setSlotForm({ ...slotForm, price: e.target.value })} placeholder="8000" inputMode="numeric" style={{ maxWidth: 200 }} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={addSlot} disabled={slotSaving}>
            {slotSaving ? "Сохраняем…" : "+ Добавить слот"}
          </button>
          {slotErr && <span style={{ color: "var(--red)", fontSize: 12 }}>{slotErr}</span>}
        </div>

        {mySlots.map((s) => (
          <div key={s.id} style={{ background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 11, padding: "10px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13 }}>
                <b>{fmtD(s.date)} · {fmtT(s.time_start)}–{fmtT(s.time_end)}</b>
                {s.title && <span style={{ color: "var(--ink-dim)" }}> · {s.title}</span>}
                <span style={{ color: "var(--ink-dim)" }}> · {s.price ? `${Number(s.price).toLocaleString("ru-RU")} ₸` : "договорная"}</span>
                {s.is_booked && <span style={{ color: "var(--green)" }}> · забронирован</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => delSlot(s.id)}>Удалить</button>
            </div>
            {Array.isArray(s.requests) && s.requests.length > 0 && (
              <div style={{ marginTop: 8, borderTop: "1px dashed var(--line)", paddingTop: 8 }}>
                {s.requests.map((b: any) => {
                  const [label, color] = BOOK_STATUS[b.status] || [b.status, "var(--ink-dim)"];
                  return (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 12, padding: "4px 0", flexWrap: "wrap" }}>
                      <span>
                        <b>{b.username}</b>
                        {b.comment && <span style={{ color: "var(--ink-dim)" }}> — {b.comment}</span>}
                        {" · "}<span style={{ color }}>{label}</span>
                      </span>
                      {b.status === "pending" && (
                        <span style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => decideBooking(b.id, "approved")}>Подтвердить</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => decideBooking(b.id, "declined")}>Отклонить</button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Блок фотогалереи ВНУТРИ анкеты роли (привязан к своей форме). title/hint зависят от роли.
  function galleryBlock(title: string, hint: string) {
    const limit = galleryLimit(roles, user.is_pro);
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>{title}</h4>
          <span style={{ fontSize: 12, color: photos.length >= limit ? "var(--accent-3)" : "var(--ink-dim)" }}>
            {photos.length} / {limit}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>{hint} До {limit} фото, каждое ≤5 МБ.</p>
        {!user.is_pro && photos.length >= limit && (
          <p style={{ fontSize: 12, color: "var(--accent-3)", margin: "0 0 12px" }}>
            Лимит достигнут. <a href="/pro" style={{ color: "var(--accent-2)", fontWeight: 600 }}>Pro</a> поднимает галерею до {limit * 4} фото.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
              <div style={{ width: "100%", height: "100%", backgroundImage: `url('${p.url}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
              <button onClick={() => deleteGalleryPhoto(p.id)} title="Удалить"
                style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%",
                  border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
          {photos.length < limit && (
            <label style={{ aspectRatio: "1", borderRadius: 10, border: "1px dashed var(--line)", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: photoUp ? "wait" : "pointer", color: "var(--ink-dim)", fontSize: 26 }}>
              {photoUp ? "…" : "+"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={photoUp}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadGalleryPhoto(f); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {photoErr && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{photoErr}</p>}
      </div>
    );
  }

  function renderContent() {
    switch (tab) {
      case "profile":
        return (
          <div className="acc-card">
            {/* Обложка */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 8 }}>Обложка профиля</label>
              <div style={{
                height: 130, borderRadius: 12, marginBottom: 8,
                background: coverUrl ? `url('${coverUrl}') center/cover no-repeat` : "linear-gradient(135deg,rgba(255,45,111,.15),rgba(124,249,255,.08))",
                border: "1px solid var(--line)",
              }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" disabled={photoUploading === "cover"}
                  onClick={() => (document.getElementById("cover-input") as HTMLInputElement)?.click()}
                  style={{ flex: 1 }}>
                  {photoUploading === "cover" ? "Загружаем..." : "⬆ Загрузить обложку"}
                </button>
                {coverUrl && (
                  <button className="btn btn-sm" disabled={photoUploading === "cover"}
                    onClick={() => deletePhoto("cover")}
                    style={{ background: "rgba(255,45,111,.12)", border: "1px solid rgba(255,45,111,.25)", color: "var(--accent)" }}>
                    ✕ Удалить
                  </button>
                )}
              </div>
              <input id="cover-input" type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto("cover", f); e.target.value = ""; }} />
            </div>

            {/* Аватар */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 8 }}>Аватар</label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  onClick={() => { if (photoUploading !== "avatar") (document.getElementById("avatar-input") as HTMLInputElement)?.click(); }}
                  title="Нажми, чтобы сменить фото"
                  role="button"
                  aria-label="Сменить аватар"
                  style={{
                    position: "relative", width: 80, height: 80, borderRadius: 16, flexShrink: 0,
                    background: user.photo ? `url('${user.photo}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
                    border: "2px solid var(--line)",
                    cursor: photoUploading === "avatar" ? "wait" : "pointer",
                    display: "flex", alignItems: "flex-end", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                  <span style={{
                    width: "100%", textAlign: "center", fontSize: 10, fontWeight: 600,
                    color: "#fff", background: "rgba(0,0,0,.45)", padding: "3px 0",
                  }}>
                    {photoUploading === "avatar" ? "…" : "Изменить"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <button className="btn btn-ghost btn-sm" disabled={photoUploading === "avatar"}
                    onClick={() => (document.getElementById("avatar-input") as HTMLInputElement)?.click()}>
                    {photoUploading === "avatar" ? "Загружаем..." : "⬆ Загрузить фото"}
                  </button>
                  {avatarUrl && (
                    <button className="btn btn-sm" disabled={photoUploading === "avatar"}
                      onClick={() => deletePhoto("avatar")}
                      style={{ background: "rgba(255,45,111,.12)", border: "1px solid rgba(255,45,111,.25)", color: "var(--accent)" }}>
                      ✕ Удалить фото
                    </button>
                  )}
                  <p style={{ fontSize: 11, color: "var(--ink-dim)", margin: 0 }}>JPG, PNG или WebP · до 5 МБ</p>
                </div>
              </div>
              <input id="avatar-input" type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto("avatar", f); e.target.value = ""; }} />
            </div>

            <h3>Базовые данные</h3>
            <div className="field">
              <label>Ник</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Город</label>
                <CitySelect value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              </div>
              <div className="field">
                <label>Опыт</label>
                <input value={form.experience} placeholder="напр. 3 года"
                  onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>О себе</label>
              <textarea rows={3} placeholder="Расскажи про свой косплей..."
                value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            {saveErr && (
              <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 10, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
                {saveErr}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn btn-primary" onClick={saveBasics} disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
              {saved && <span style={{ color: "var(--green)", fontSize: 13 }}>✓ Сохранено</span>}
            </div>
          </div>
        );

      case "roles":
        return (
          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Роли</h3>
              <span style={{ fontSize: 12, color: rolesLoading ? "var(--ink-dim)" : "var(--green)", opacity: rolesLoading || rolesSaved ? 1 : 0, transition: "opacity .3s" }}>
                {rolesLoading ? "Сохраняем..." : "✓ Сохранено"}
              </span>
            </div>
            <div className="role-pick">
              {ALL_ROLES.map((r) => (
                <div key={r.slug}
                  className={`role-pick-card${roles.includes(r.slug) ? " on" : ""}`}
                  onClick={() => toggleRole(r.slug)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="role-pick-ic">{r.icon}</div>
                  <div className="role-pick-name">{r.name}</div>
                  <div className="role-pick-d">{r.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "12px 0 0" }}>
              Роли влияют на статистику сайта и видимость в каталогах. Выбери роль — ниже появится её анкета.
            </p>

            {/* ─── Анкеты выбранных ролей ─── */}
            {roles.some((r) => ROLE_FORMS[r]) && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                <h3 style={{ margin: "0 0 4px" }}>Анкеты ролей</h3>
                {roles.filter((r) => ROLE_FORMS[r]).map((r) => renderRoleForm(r))}
              </div>
            )}

            {/* ─── Мои мастерские (только при роли «Мастерская») ─── */}
            {roles.includes("workshop") && (
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>Мои мастерские{workshops.length > 0 ? ` (${workshops.length})` : ""}</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowWsForm((v) => !v); setWsErr(""); }}>
                  {showWsForm ? "Отмена" : "+ Создать"}
                </button>
              </div>

              {showWsForm && (
                <div style={{ padding: 16, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
                  <div className="field">
                    <label>Название</label>
                    <input value={wsForm.name} placeholder="Напр. EVA Forge"
                      onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="field">
                      <label>Тип</label>
                      <select value={wsForm.type} onChange={(e) => setWsForm({ ...wsForm, type: e.target.value })}>
                        {Object.entries(WORKSHOP_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Город</label>
                      <CitySelect value={wsForm.city} onChange={(v) => setWsForm({ ...wsForm, city: v })} emptyLabel="Выбери город" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Срок выполнения (необязательно)</label>
                    <input value={wsForm.eta} placeholder="напр. 7-14 дней"
                      onChange={(e) => setWsForm({ ...wsForm, eta: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Описание</label>
                    <textarea rows={2} value={wsForm.about} placeholder="Чем занимается мастерская..."
                      onChange={(e) => setWsForm({ ...wsForm, about: e.target.value })} />
                  </div>

                  <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 8 }}>Услуги и цены</label>
                  {wsForm.services.map((svc, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input value={svc.name} placeholder="Услуга (напр. Шлем)" style={{ flex: 2 }}
                        onChange={(e) => {
                          const next = [...wsForm.services]; next[i] = { ...next[i], name: e.target.value };
                          setWsForm({ ...wsForm, services: next });
                        }} />
                      <input type="number" value={svc.price_from} placeholder="₸ от" style={{ flex: 1, minWidth: 0 }}
                        onChange={(e) => {
                          const next = [...wsForm.services]; next[i] = { ...next[i], price_from: e.target.value };
                          setWsForm({ ...wsForm, services: next });
                        }} />
                      {wsForm.services.length > 1 && (
                        <button onClick={() => setWsForm({ ...wsForm, services: wsForm.services.filter((_, j) => j !== i) })}
                          style={{ padding: "0 12px", borderRadius: 8, cursor: "pointer",
                            background: "rgba(255,45,111,.1)", border: "1px solid rgba(255,45,111,.2)", color: "var(--accent)" }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setWsForm({ ...wsForm, services: [...wsForm.services, { name: "", price_from: "" }] })}
                    style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 14,
                      background: "var(--bg)", border: "1px dashed var(--line)", color: "var(--ink-dim)" }}>
                    + Добавить услугу
                  </button>

                  {wsErr && (
                    <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 10, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
                      {wsErr}
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={createWorkshop} disabled={wsSaving}>
                    {wsSaving ? "Создаём..." : "Создать мастерскую"}
                  </button>
                </div>
              )}

              {workshops.length === 0 && !showWsForm ? (
                <EmptyBlock icon="◆" title="Мастерских пока нет"
                  sub="Шьёшь, печатаешь на 3D или делаешь EVA-броню? Создай мастерскую — её увидят в каталоге, и тебе пойдут заказы." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {workshops.map((w) => (
                    <div key={w.id} style={{ padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, marginRight: 8,
                            background: "rgba(124,249,255,.12)", color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.25)" }}>
                            {WORKSHOP_TYPES[w.type] || w.type}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>📍 {w.city}{w.eta ? ` · ${w.eta}` : ""}</span>
                          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{w.name}</div>
                          {w.about && <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>{w.about}</div>}
                          {w.services?.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                              {w.services.map((s) => (
                                <span key={s.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6,
                                  background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-dim)" }}>
                                  {s.name} · от {s.price_from.toLocaleString()} ₸
                                </span>
                              ))}
                            </div>
                          )}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, color: "var(--ink-dim)", marginBottom: 6 }}>
                              Фото работ · {(w.photos || []).length} / 5
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {(w.photos || []).map((p) => (
                                <div key={p.id} style={{ position: "relative", width: 64, height: 64 }}>
                                  <div style={{
                                    width: "100%", height: "100%", borderRadius: 8,
                                    backgroundImage: `url('${p.url}')`, backgroundSize: "cover", backgroundPosition: "center",
                                  }} />
                                  <button onClick={() => deleteWsPhoto(w.id, p.id)} title="Удалить фото"
                                    style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%",
                                      background: "var(--bg)", border: "1px solid var(--line)", color: "var(--accent)",
                                      fontSize: 10, lineHeight: 1, cursor: "pointer", padding: 0 }}>✕</button>
                                </div>
                              ))}
                              {(w.photos || []).length < 5 && (
                                <label style={{
                                  width: 64, height: 64, borderRadius: 8, cursor: "pointer",
                                  border: "1px dashed var(--line)", display: "flex", alignItems: "center",
                                  justifyContent: "center", color: "var(--ink-dim)", fontSize: 20,
                                }}>
                                  +
                                  <input type="file" accept="image/*" style={{ display: "none" }}
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWsPhoto(w.id, f); e.target.value = ""; }} />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <a href={`/workshops/${w.id}`}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8,
                              background: "rgba(124,249,255,.1)", border: "1px solid var(--line)", color: "var(--accent-2)" }}>
                            Открыть
                          </a>
                          <button onClick={() => deleteWorkshop(w.id)}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                              background: "rgba(255,45,111,.1)", border: "1px solid rgba(255,45,111,.2)", color: "var(--accent)" }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        );

      case "orders":
        return (
          <div className="acc-card">
            <h3 style={{ marginBottom: 14 }}>Мои заказы{ordersCount > 0 ? ` (${ordersCount})` : ""}</h3>
            {myOrders.length === 0 ? (
              <EmptyBlock icon="⚒" title="Заказов пока нет"
                sub="Когда ты сделаешь заказ в мастерскую — он появится здесь." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myOrders.map((o) => (
                  <div key={o.id} style={{
                    padding: "14px 16px", background: "var(--bg-2)",
                    border: "1px solid var(--line)", borderRadius: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>→ {o.workshop_name}</div>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                        background: "rgba(0,0,0,.3)",
                        color: ORDER_STATUS_COLORS[o.status] || "var(--ink)",
                        border: `1px solid ${ORDER_STATUS_COLORS[o.status] || "var(--line)"}33`,
                      }}>
                        {ORDER_STATUS_LABELS[o.status] || o.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 10px", lineHeight: 1.5 }}>
                      {o.description}
                    </p>
                    <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ink-dim)", flexWrap: "wrap", alignItems: "center" }}>
                      {o.budget ? <span>Бюджет: <b style={{ color: "var(--accent-3)" }}>{o.budget.toLocaleString()} ₸</b></span> : null}
                      {o.deadline ? <span>Дедлайн: {o.deadline}</span> : null}
                      <span>{new Date(o.created_at).toLocaleDateString("ru-RU")}</span>
                      {o.status === "done" && (o.has_review
                        ? <span style={{ color: "var(--green)" }}>✓ Отзыв оставлен</span>
                        : <button className="btn btn-ghost btn-sm" onClick={() => { setReviewFor(reviewFor === o.id ? null : o.id); setRevRating(5); setRevText(""); }}>
                            Оставить отзыв
                          </button>)}
                    </div>
                    {reviewFor === o.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                        <div style={{ marginBottom: 8 }}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} onClick={() => setRevRating(n)} style={{
                              cursor: "pointer", fontSize: 22, marginRight: 2,
                              color: n <= revRating ? "var(--accent-3)" : "var(--line)",
                            }}>★</span>
                          ))}
                        </div>
                        <div className="field" style={{ marginBottom: 10 }}>
                          <textarea placeholder="Как прошёл заказ? (необязательно)" value={revText}
                            onChange={(e) => setRevText(e.target.value)} />
                        </div>
                        <button className="btn btn-primary btn-sm" disabled={revBusy} onClick={() => submitReview(o.id)}>
                          {revBusy ? "..." : "Отправить отзыв"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "responses":
        return (
          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Входящие заказы{incomingOrders.length > 0 ? ` (${incomingOrders.length})` : ""}</h3>
              {newIncoming > 0 && (
                <span style={{ fontSize: 12, padding: "3px 10px", background: "rgba(124,249,255,.15)", color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.3)", borderRadius: 20 }}>
                  {newIncoming} новых
                </span>
              )}
            </div>
            {incomingOrders.length === 0 ? (
              <EmptyBlock icon="↗" title="Откликов пока нет"
                sub="Когда косплееры оставят заявку в вашу мастерскую — они появятся здесь." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {incomingOrders.map((order) => (
                  <div key={order.id} style={{
                    padding: "14px 16px", background: "var(--bg-2)",
                    border: "1px solid var(--line)", borderRadius: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>@{order.customer_username}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>→ {order.workshop_name}</div>
                      </div>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                        background: "rgba(0,0,0,.3)",
                        color: ORDER_STATUS_COLORS[order.status] || "var(--ink)",
                        border: `1px solid ${ORDER_STATUS_COLORS[order.status] || "var(--line)"}33`,
                      }}>
                        {order.status_display}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 10px", lineHeight: 1.5 }}>
                      {order.description}
                    </p>
                    {order.budget && (
                      <div style={{ fontSize: 12, color: "var(--accent-3)", marginBottom: 10 }}>
                        Бюджет: {order.budget.toLocaleString()} ₸
                      </div>
                    )}
                    {order.status === "request" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary btn-sm"
                          onClick={() => updateIncomingStatus(order.id, "accepted")}>
                          Принять
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => updateIncomingStatus(order.id, "cancelled")}
                          style={{ color: "var(--ink-dim)" }}>
                          Отклонить
                        </button>
                      </div>
                    )}
                    {order.status === "accepted" && (
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => updateIncomingStatus(order.id, "in_work")}>
                        Взять в работу
                      </button>
                    )}
                    {order.status === "in_work" && (
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => updateIncomingStatus(order.id, "shipped")}>
                        Отметить как отправлено
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "messages":
        return (
          <div className="acc-card" style={{ padding: 0, overflow: "hidden" }}>
            <MessagesPanel
              toUser={msgTo}
              listingId={msgListing}
              onToConsumed={() => { setMsgTo(null); setMsgListing(null); window.history.replaceState({}, "", "/cabinet?tab=messages"); }}
              onUnreadChange={setUnreadMsgs}
            />
          </div>
        );

      case "listings":
        return (
          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Объявления</h3>
              {listingScope === "mine" && (
                <button className="btn btn-primary btn-sm"
                  onClick={() => showListingForm ? cancelListingForm() : setShowListingForm(true)}>
                  {showListingForm ? "Отмена" : "+ Создать"}
                </button>
              )}
            </div>

            <p style={{ color: "var(--ink-dim)", fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>
              «Продаю / Куплю» попадают в <a href="/market" style={{ color: "var(--accent-2)" }}>Барахолку</a>,
              «Ищу спеца / Коллаб» — в <a href="/jobs" style={{ color: "var(--accent-2)" }}>Слоты</a>.
            </p>

            {/* Под-вкладки: мои / общие */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => switchListingScope("mine")}
                className={`chip${listingScope === "mine" ? " on" : ""}`}>
                Мои{listings.length > 0 ? ` · ${listings.length}` : ""}
              </button>
              <button onClick={() => switchListingScope("all")}
                className={`chip${listingScope === "all" ? " on" : ""}`}>
                Общие{publicListings ? ` · ${publicListings.length}` : ""}
              </button>
            </div>

            {listingScope === "all" ? (
              publicListings === null ? (
                <div style={{ color: "var(--ink-dim)", fontSize: 13, padding: "8px 0" }}>Загрузка…</div>
              ) : publicListings.length === 0 ? (
                <EmptyBlock icon="⌂" title="Объявлений пока нет"
                  sub="Здесь появляются все активные объявления платформы — слоты, коллабы, барахолка." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {publicListings.map((l) => (
                    <div key={l.id} style={{
                      padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 11,
                    }}>
                      <div>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 20, marginRight: 8,
                          background: "rgba(157,124,255,.15)", color: "var(--accent-4)", border: "1px solid rgba(157,124,255,.25)",
                        }}>
                          {l.type_display || LISTING_TYPES[l.type] || l.type}
                        </span>
                        {l.city && <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>📍 {l.city}</span>}
                        {me.id && l.owner_id === me.id && (
                          <span style={{ fontSize: 10, color: "var(--accent-2)", marginLeft: 8 }}>· моё</span>
                        )}
                        <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{l.title}</div>
                        {l.description && <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>{l.description}</div>}
                        <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center" }}>
                          {l.price && <span style={{ fontSize: 12, color: "var(--accent-3)" }}>{Number(l.price).toLocaleString()} ₸</span>}
                          {l.owner && <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>@{l.owner}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
            <>
            {showListingForm && (
              <div style={{ padding: "16px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Тип <span style={{ color: "var(--accent)" }}>*</span></label>
                    <select value={listingForm.type} onChange={(e) => setListingForm({ ...listingForm, type: e.target.value })}>
                      <option value="">— выберите тип —</option>
                      {Object.entries(LISTING_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {LISTING_SECTION[listingForm.type] ? (
                      <small style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--ink-dim)" }}>
                        Появится в разделе «<b style={{ color: "var(--accent-2)" }}>{LISTING_SECTION[listingForm.type].name}</b>»
                      </small>
                    ) : (
                      <small style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--ink-dim)" }}>
                        Определяет раздел: Продаю/Куплю → Барахолка, Ищу спеца/Коллаб → Слоты
                      </small>
                    )}
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Город <span style={{ color: "var(--accent)" }}>*</span></label>
                    <CitySelect value={listingForm.city} onChange={(v) => setListingForm({ ...listingForm, city: v })} emptyLabel="— выберите город —" />
                  </div>
                </div>
                <div className="field">
                  <label>Заголовок</label>
                  <input value={listingForm.title} placeholder="Ищу фотографа для съёмки в Алматы"
                    onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} />
                </div>
                <div className="field">
                  <label>Описание</label>
                  <textarea rows={2} value={listingForm.description} placeholder="Подробнее о проекте..."
                    onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} />
                </div>
                <div className="field">
                  <label>Бюджет ₸ (необязательно)</label>
                  <input type="number" value={listingForm.price} placeholder="15000"
                    onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} />
                </div>
                <div className="field">
                  <label>Контакты для связи (необязательно)</label>
                  <input value={listingForm.contact} placeholder="@telegram, +7 700 000 00 00, почта"
                    onChange={(e) => setListingForm({ ...listingForm, contact: e.target.value })} />
                </div>
                <button className="btn btn-primary" onClick={createListing}
                  disabled={listingSaving || !listingForm.title.trim() || !listingForm.type || !listingForm.city}>
                  {listingSaving ? "Сохраняем..." : editingListingId !== null ? "Сохранить" : "Опубликовать"}
                </button>
              </div>
            )}

            {listings.length === 0 && !showListingForm ? (
              <EmptyBlock icon="⌂" title="Объявлений пока нет"
                sub="Ищешь фотографа, продаёшь реквизит или зовёшь на коллаборацию — создай объявление." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {listings.map((listing) => (
                  <div key={listing.id} style={{
                    padding: "12px 14px", background: "var(--bg-2)",
                    border: `1px solid ${listing.is_active ? "var(--line)" : "rgba(255,255,255,.05)"}`,
                    borderRadius: 11, opacity: listing.is_active ? 1 : 0.55,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 20, marginRight: 8,
                          background: "rgba(157,124,255,.15)", color: "var(--accent-4)",
                          border: "1px solid rgba(157,124,255,.25)",
                        }}>
                          {LISTING_TYPES[listing.type] || listing.type}
                        </span>
                        {LISTING_SECTION[listing.type] && (
                          <a href={LISTING_SECTION[listing.type].href} style={{ fontSize: 11, color: "var(--accent-2)", marginRight: 8 }}>
                            → {LISTING_SECTION[listing.type].name}
                          </a>
                        )}
                        {listing.city && <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>📍 {listing.city}</span>}
                        <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{listing.title}</div>
                        {listing.description && (
                          <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>{listing.description}</div>
                        )}
                        {listing.price && (
                          <div style={{ fontSize: 12, color: "var(--accent-3)", marginTop: 4 }}>
                            {listing.price.toLocaleString()} ₸
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => toggleListingActive(listing.id, listing.is_active)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                            background: listing.is_active ? "rgba(124,249,255,.1)" : "rgba(255,255,255,.05)",
                            border: "1px solid var(--line)", color: listing.is_active ? "var(--accent-2)" : "var(--ink-dim)" }}>
                          {listing.is_active ? "Активно" : "Закрыто"}
                        </button>
                        <button onClick={() => startEditListing(listing)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                            background: "rgba(157,124,255,.1)", border: "1px solid rgba(157,124,255,.25)", color: "var(--accent-4)" }}>
                          Изменить
                        </button>
                        <button onClick={() => deleteListing(listing.id)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                            background: "rgba(255,45,111,.1)", border: "1px solid rgba(255,45,111,.2)", color: "var(--accent)" }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </>
            )}
          </div>
        );

      case "favs":
        return (
          <div className="acc-card">
            <h3>Избранное{favorites.length > 0 ? ` (${favorites.length})` : ""}</h3>
            {favorites.length === 0 ? (
              <EmptyBlock icon="♥" title="Список пуст"
                sub="Сохраняй косплееров, фотографов и мастерские — кнопкой «♡ Сохранить» на их странице."
                cta={{ label: "Смотреть косплееров", href: "/people" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {favorites.map((f) => {
                  const it = f.item;
                  const isWs = f.kind === "workshop";
                  const href = isWs ? `/workshops/${it.id}` : `/people/${it.id}`;
                  const title = isWs ? it.name : it.display_name;
                  const img = isWs ? it.cover : it.avatar;
                  const sub = isWs
                    ? `Мастерская · 📍 ${it.city || "—"}`
                    : `${(it.roles || []).map((r: string) => ROLE_MAP[r] || r).join(" · ") || "Косплеер"}${it.city ? ` · ${it.city}` : ""}`;
                  return (
                    <div key={`${f.kind}-${it.id}`} style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 11 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: img ? `url('${img}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
                        border: "1px solid var(--line)" }} />
                      <a href={href} style={{ flex: 1, color: "var(--ink)" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {title}
                          <span style={{ fontSize: 10, marginLeft: 8, padding: "2px 7px", borderRadius: 20,
                            background: isWs ? "rgba(124,249,255,.12)" : "rgba(157,124,255,.12)",
                            color: isWs ? "var(--accent-2)" : "var(--accent-4)",
                            border: `1px solid ${isWs ? "rgba(124,249,255,.25)" : "rgba(157,124,255,.25)"}` }}>
                            {isWs ? "Мастерская" : "Профиль"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{sub}</div>
                      </a>
                      <button onClick={() => removeFavorite(f.kind, it.id)}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", flexShrink: 0,
                          background: "rgba(255,45,111,.1)", border: "1px solid rgba(255,45,111,.2)", color: "var(--accent)" }}>
                        ✕ Убрать
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "subs": {
        const fmt = (s: string | null) => { try { return s ? new Date(s).toLocaleDateString("ru-RU") : ""; } catch { return ""; } };
        return (
          <>
          <div className="acc-card" style={{ marginBottom: 18 }}>
            <h3 style={{ margin: "0 0 4px" }}>Pro</h3>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 16px" }}>
              Единый тариф: один Pro покрывает профиль и все ваши мастерские.
              Первые 6 месяцев бесплатно, дальше — оплата криптой (USDT / TON / BTC), зачисление автоматически.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
              padding: "13px 16px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
              <div>
                <b style={{ fontSize: 14 }}>Pro · профиль и мастерские</b>
                <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                  {user.is_pro
                    ? <span style={{ color: "var(--green)" }}>Активен{user.pro_active_until ? ` до ${fmt(user.pro_active_until)}` : " · бессрочно"}</span>
                    : "Синяя галочка, приоритет в каталоге и поиске, аналитика, boost мастерских"}
                </div>
              </div>
              {user.is_pro
                ? <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(124,249,255,.12)", color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.3)" }}>✓ Pro</span>
                    <CryptoPayButton purpose="pro" months={1} label="Продлить криптой" className="btn btn-ghost btn-sm" nextPath="/cabinet?tab=subs" />
                  </div>
                : <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-primary btn-sm" disabled={activating === "pro"} onClick={() => activatePlan()}>
                      {activating === "pro" ? "..." : "Активировать · 6 мес бесплатно"}
                    </button>
                    <CryptoPayButton purpose="pro" months={1} label="Оплатить криптой" className="btn btn-ghost btn-sm" nextPath="/cabinet?tab=subs" />
                  </div>}
            </div>
          </div>

          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ margin: 0 }}>Мои подписки{following.length > 0 ? ` (${following.length})` : ""}</h3>
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>Подписчиков: {followersCount}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 16px" }}>
              Косплееры, фотографы, мастерские и магазины, на которых ты подписан.
            </p>
            {following.length === 0 ? (
              <EmptyBlock icon="♛" title="Пока нет подписок"
                sub="Подпишись на косплееров, фотографов и мастерские — они появятся здесь, а ты не пропустишь их новинки."
                cta={{ label: "Смотреть косплееров", href: "/people" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {following.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 11 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: p.avatar ? `url('${p.avatar}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
                      border: "1px solid var(--line)" }} />
                    <a href={`/people/${p.id}`} style={{ flex: 1, color: "var(--ink)" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.display_name}{p.is_verified && <span className="verified" style={{ marginLeft: 4 }}>✓</span>}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                        {(p.roles || []).map((r: string) => ROLE_MAP[r] || r).join(" · ") || "Фанат"}{p.city ? ` · ${p.city}` : ""}
                      </div>
                    </a>
                    <button onClick={() => unfollow(p.user_id)}
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", flexShrink: 0,
                        background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-dim)" }}>
                      Отписаться
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
        );
      }

      case "analytics": {
        const ORD_LABELS: Record<string, string> = ORDER_STATUS_LABELS;
        const StatCard = ({ val, label }: { val: number | string; label: string }) => (
          <div style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-.03em" }}>{val}</div>
            <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4 }}>{label}</div>
          </div>
        );
        return (
          <div className="acc-card">
            <h2 style={{ margin: "0 0 4px" }}>Аналитика</h2>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
              Расширенная статистика профиля и мастерских — льгота Pro.
            </p>

            {!analytics ? (
              <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Загрузка…</p>
            ) : analytics.pro === false ? (
              <div className="about" style={{
                background: "linear-gradient(135deg,rgba(255,45,111,.12),rgba(124,249,255,.06))",
                border: "1px solid rgba(255,45,111,.3)", textAlign: "center", padding: "28px 24px",
              }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>📊</div>
                <h3 style={{ margin: "0 0 6px" }}>Аналитика доступна в Pro</h3>
                <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 16px" }}>
                  Подписчики, лайки образов, заказы по статусам, рейтинг и отзывы мастерских — в одном месте.
                </p>
                <a href="/pro" className="btn btn-primary">Подключить Pro · 6 мес бесплатно</a>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <a href="/api/v1/profiles/me/media-kit/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">⬇ Скачать медиа-кит (PDF)</a>
                </div>
                <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 12px" }}>Профиль</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
                  <StatCard val={analytics.profile.views_30d ?? 0} label="Просмотров · 30 дн" />
                  <StatCard val={analytics.profile.unique_viewers_30d ?? 0} label="Уник. зрителей" />
                  <StatCard val={analytics.profile.followers} label="Подписчиков" />
                  <StatCard val={analytics.profile.looks} label="Образов" />
                  <StatCard val={analytics.profile.look_likes} label="Лайков образов" />
                  <StatCard val={analytics.profile.following} label="Подписок" />
                </div>

                {analytics.business && (
                  <>
                    <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 12px" }}>Бизнес · мастерские</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 16 }}>
                      <StatCard val={analytics.business.workshops} label="Мастерских" />
                      <StatCard val={analytics.business.orders_total} label="Заказов всего" />
                      <StatCard val={analytics.business.products} label="Товаров" />
                      <StatCard val={analytics.business.reviews} label="Отзывов" />
                      <StatCard val={analytics.business.rating_avg > 0 ? `★ ${analytics.business.rating_avg}` : "—"} label="Рейтинг" />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {Object.entries(analytics.business.orders_by_status as Record<string, number>)
                        .filter(([, n]) => n > 0)
                        .map(([st, n]) => (
                          <span key={st} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--ink-dim)" }}>
                            {ORD_LABELS[st] || st}: <b style={{ color: "var(--ink)" }}>{n}</b>
                          </span>
                        ))}
                    </div>
                  </>
                )}

                {viewers && viewers.pro !== false && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 12px" }}>Кто смотрел профиль</h3>
                    {Array.isArray(viewers.viewers) && viewers.viewers.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {viewers.viewers.map((v: any, i: number) => (
                          <a key={`${v.user_id}-${i}`} href={v.profile_id ? `/people/${v.profile_id}` : "#"}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
                            {v.avatar
                              ? <img src={v.avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                              : <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-3)", display: "grid", placeItems: "center", fontSize: 14, color: "var(--ink-dim)" }}>{(v.display_name || "?")[0]?.toUpperCase()}</span>}
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{v.display_name}</span>
                            <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{v.day ? new Date(v.day).toLocaleDateString("ru-RU") : ""}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>Пока никто не смотрел ваш профиль. Заполните анкету и публикуйте образы — вас заметят.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      case "socials":
        return (
          <div className="acc-card">
            <h2 style={{ margin: "0 0 4px" }}>Соцсети</h2>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
              Добавь ссылки или ники — покажем их на твоём профиле. Можно вставить полную ссылку или просто ник.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0 16px" }}>
              {Object.entries(SOCIAL_META).map(([slug, meta]) => (
                <div className="field" key={slug}>
                  <label>
                    <span style={{ color: "var(--accent-2)", marginRight: 6 }}>{meta.icon}</span>
                    {meta.label}
                  </label>
                  <input
                    value={socials[slug] || ""}
                    placeholder={meta.base ? `${meta.base}ник или ник` : "ник / ссылка"}
                    onChange={(e) => setSocials((prev) => ({ ...prev, [slug]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
              <button className="btn btn-primary" onClick={saveSocials} disabled={socialsSaving}>
                {socialsSaving ? "Сохраняем..." : "Сохранить"}
              </button>
              <span style={{ fontSize: 12, color: "var(--green)", opacity: socialsSaved ? 1 : 0, transition: "opacity .3s" }}>
                ✓ Сохранено
              </span>
            </div>
          </div>
        );

      case "gallery": {
        const gLimit = galleryLimit(roles, user.is_pro);
        return (
          <div className="acc-card">
            <h2 style={{ margin: "0 0 4px" }}>Фотогалерея</h2>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
              Общая галерея профиля — образы, портреты, работы. Видна на твоей странице.
            </p>
            {gLimit > 0 ? (
              galleryBlock("Мои фото", "Загрузи лучшие кадры.")
            ) : (
              <div style={{ padding: "18px 16px", background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 12 }}>
                <p style={{ fontSize: 14, margin: "0 0 12px" }}>
                  Фотогалерея доступна для ролей <b>Косплеер</b>, <b>Фотограф</b> или <b>Локация</b>.
                  Добавь роль — и сможешь загружать фото.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setTab("roles")}>Перейти к ролям →</button>
              </div>
            )}
          </div>
        );
      }

      case "shoots": {
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

      case "rent": {
        const refetchCostumes = () => fetch("/api/v1/costumes/?mine=1", { credentials: "include" })
          .then((r) => r.ok ? r.json() : null).then((d) => { const l = d?.results ?? d; if (Array.isArray(l)) setMyCostumes(l); });
        const decideRental = async (reqId: number, st: string) => {
          await fetch(`/api/v1/rentals/${reqId}/`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: st }) });
          refetchCostumes();
        };
        const costumes = myCostumes || [];
        const rentals = myRentals || [];
        const RENT_RU: Record<string, string> = { pending: "Заявка", approved: "Подтверждена", declined: "Отклонена", cancelled: "Отменена" };
        return (
          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
              <h2 style={{ margin: 0 }}>Прокат костюмов</h2>
              <a href="/rent/new" className="btn btn-primary btn-sm">+ Сдать костюм</a>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
              Сдавайте свои костюмы и берите чужие. Оплата и залог — напрямую с второй стороной.
            </p>

            <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 8px" }}>Мои костюмы ({costumes.length})</h3>
            {costumes.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 16px" }}>Вы пока не выставляли костюмы.</p>}
            {costumes.map((c) => {
              const pend = (c.requests || []).filter((r: any) => r.status === "pending");
              return (
                <div key={c.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
                  <div className="info-row" style={{ alignItems: "center", border: "none", padding: 0 }}>
                    <a href={`/rent/${c.id}`} style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</a>
                    <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                      {c.price_day != null ? `${Number(c.price_day).toLocaleString("ru-RU")} ₸/сут` : "договорная"} · {c.status_display}
                    </span>
                  </div>
                  {pend.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                      {pend.map((r: any) => (
                        <div key={r.id} className="info-row" style={{ alignItems: "center" }}>
                          <span style={{ fontSize: 13 }}>@{r.username}{(r.date_from || r.date_to) && <span style={{ color: "var(--ink-dim)" }}> · {r.date_from || "?"}–{r.date_to || "?"}</span>}</span>
                          <span style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-primary btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => decideRental(r.id, "approved")}>принять</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => decideRental(r.id, "declined")}>откл.</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "18px 0 8px" }}>Мои аренды ({rentals.length})</h3>
            {rentals.length > 0 ? rentals.map((r) => (
              <a key={r.id} href={`/rent/${r.costume.id}`} className="info-row" style={{ alignItems: "center" }}>
                <span style={{ fontSize: 14 }}>{r.costume.title}</span>
                <span style={{ fontSize: 12, color: r.status === "approved" ? "var(--green)" : "var(--ink-dim)" }}>{RENT_RU[r.status] || r.status}</span>
              </a>
            )) : <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0 }}>Вы ничего не арендовали. <a href="/rent">Каталог проката</a>.</p>}
          </div>
        );
      }

      case "matches":
        return (
          <div className="acc-card">
            <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 4px" }}>Единомышленники</h2>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
              Косплееры и фанаты с общими фандомами и хобби. Чем больше совпадений — тем выше в списке.
            </p>
            {matches === null ? (
              <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Загрузка…</p>
            ) : !matchesReady ? (
              <EmptyBlock icon="♥" title="Заполни анкету фаната"
                sub="Укажи любимые фандомы и хобби во вкладке «Роли и услуги» — и мы найдём похожих на тебя." />
            ) : matches.length === 0 ? (
              <EmptyBlock icon="♥" title="Пока никого"
                sub="Совпадений по твоим фандомам и хобби ещё нет. Загляни позже — сообщество растёт." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {matches.map((m) => (
                  <div key={m.user_id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                    background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12,
                  }}>
                    <a href={`/people/${m.profile_id}`} style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0, backgroundSize: "cover", backgroundPosition: "center",
                      backgroundImage: m.avatar ? `url('${m.avatar}')` : "linear-gradient(135deg,rgba(255,45,111,.3),rgba(124,249,255,.15))",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={`/people/${m.profile_id}`} style={{ fontWeight: 700, fontSize: 14 }}>{m.display_name}</a>
                      {m.city && <span style={{ color: "var(--ink-dim)", fontSize: 12 }}> · {m.city}</span>}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {[...m.shared_fandoms, ...m.shared_hobbies].slice(0, 6).map((t: string) => (
                          <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
                            background: "rgba(124,249,255,.1)", border: "1px solid rgba(124,249,255,.25)", color: "var(--accent-2)" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    {m.is_following ? (
                      <span style={{ fontSize: 12, color: "var(--green)", flexShrink: 0 }}>✓ Вы подписаны</span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => followMatch(m.user_id)}>Подписаться</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "settings":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Учётные данные */}
            <div className="acc-card">
              <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 14px" }}>Аккаунт</h2>
              <div className="info-row">
                <span>Email</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--ink-dim)" }}>{me.email || "—"}</span>
                  {me.email && emStep === 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEmStep(1); setEmMsg(null); }}>Изменить</button>
                  )}
                </span>
              </div>
              {me.phone && <div className="info-row"><span>Телефон</span><span style={{ color: "var(--ink-dim)" }}>{me.phone}</span></div>}

              {emStep === 1 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <div className="field"><label>Новый email</label>
                    <input type="email" value={emNew} onChange={(e) => setEmNew(e.target.value)} placeholder="new@example.com" style={{ maxWidth: 320 }} /></div>
                  <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>На новый адрес придёт код подтверждения.</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={requestEmailChange} disabled={emBusy || !emNew}>{emBusy ? "Отправляем…" : "Отправить код"}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEmStep(0); setEmNew(""); setEmMsg(null); }}>Отмена</button>
                    {emMsg && <span style={{ fontSize: 12, color: emMsg.ok ? "var(--green)" : "var(--red)" }}>{emMsg.text}</span>}
                  </div>
                </div>
              )}

              {emStep === 2 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <div className="field"><label>Код из письма на {emNew}</label>
                    <input inputMode="numeric" value={emCode} onChange={(e) => setEmCode(e.target.value)} placeholder="6 цифр" style={{ maxWidth: 160, letterSpacing: 4, fontFamily: "var(--font-mono),monospace" }} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={confirmEmailChange} disabled={emBusy || emCode.length < 4}>{emBusy ? "Проверяем…" : "Подтвердить"}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEmStep(0); setEmNew(""); setEmCode(""); setEmMsg(null); }}>Отмена</button>
                    {emMsg && <span style={{ fontSize: 12, color: emMsg.ok ? "var(--green)" : "var(--red)" }}>{emMsg.text}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Приватность */}
            <div className="acc-card">
              <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 4px" }}>Приватность</h2>
              <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>Те же тумблеры есть во вкладке «Роли и услуги».</p>
              <div className="toggle-row" style={{ padding: "8px 0" }}>
                <div><strong style={{ fontSize: 13 }}>Открыт для работы</strong><div style={{ fontSize: 12, color: "var(--ink-dim)" }}>Показывать бейдж «Доступен» в профиле</div></div>
                <div className={`toggle${availForWork ? " on" : ""}`} style={{ cursor: "pointer" }}
                  onClick={() => { const v = !availForWork; setAvailForWork(v); patchProfile({ available_for_work: v }); }} />
              </div>
              <div className="toggle-row" style={{ padding: "8px 0" }}>
                <div><strong style={{ fontSize: 13 }}>Принимать сообщения</strong><div style={{ fontSize: 12, color: "var(--ink-dim)" }}>Разрешить писать тебе в мессенджер</div></div>
                <div className={`toggle${acceptMessages ? " on" : ""}`} style={{ cursor: "pointer" }}
                  onClick={() => { const v = !acceptMessages; setAcceptMessages(v); patchProfile({ accept_messages: v }); }} />
              </div>
            </div>

            {/* Pro-кастомизация (1.4/1.6) */}
            <div className="acc-card">
              <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 4px" }}>Pro-кастомизация</h2>
              {!user.is_pro ? (
                <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  Свой адрес профиля, акцентный цвет, закреплённые образы и скрытие из каталога — фишки{" "}
                  <a href="/pro" style={{ color: "var(--accent-2)" }}>Pro</a>.
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>Персонализируйте профиль — это видят гости.</p>
                  <div className="field"><label>Свой адрес профиля</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>/u/</span>
                      <input value={custSlug} onChange={(e) => setCustSlug(e.target.value)} placeholder="nick" style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div className="field"><label>Акцентный цвет</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="color" value={custAccent} onChange={(e) => setCustAccent(e.target.value)} style={{ width: 48, height: 34, padding: 2, background: "none", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }} />
                      <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{custAccent}</span>
                    </div>
                  </div>
                  <div className="toggle-row" style={{ padding: "8px 0" }}>
                    <div><strong style={{ fontSize: 13 }}>Скрыть из каталога</strong><div style={{ fontSize: 12, color: "var(--ink-dim)" }}>Профиль не показывается в списках, но доступен по прямой ссылке</div></div>
                    <div className={`toggle${custHide ? " on" : ""}`} style={{ cursor: "pointer" }} onClick={() => setCustHide((v) => !v)} />
                  </div>
                  {myLooks.length > 0 && (
                    <div className="field"><label>Закреплённые образы (до 3)</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {myLooks.map((l) => {
                          const on = pinnedIds.includes(l.id);
                          return (
                            <button key={l.id} type="button" onClick={() => togglePin(l.id)}
                              style={{ fontSize: 12, padding: "5px 11px", borderRadius: 16, cursor: "pointer",
                                border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                                background: on ? "rgba(255,45,111,.12)" : "transparent", color: on ? "var(--accent)" : "var(--ink-dim)" }}>
                              {on ? "📌 " : ""}{l.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="field"><label>Приём донатов (крипта · без комиссии платформы)</label>
                    {donMethods.map((dm, i) => {
                      const meta = DONATION_KIND_META[dm.kind] || { label: dm.kind, network: "" };
                      return (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--accent-2)", whiteSpace: "nowrap" }}>{meta.label} · {meta.network}</span>
                          <code style={{ flex: 1, fontSize: 11, wordBreak: "break-all", background: "var(--bg-3)", padding: "4px 8px", borderRadius: 6 }}>{dm.address}</code>
                          <button onClick={() => setDonMethods((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16 }}>×</button>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={donDraft.kind} onChange={(e) => setDonDraft({ ...donDraft, kind: e.target.value })} style={{ maxWidth: 120 }}>
                        {DONATION_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                      </select>
                      <input value={donDraft.address} onChange={(e) => setDonDraft({ ...donDraft, address: e.target.value })} placeholder="адрес кошелька" style={{ flex: 1 }} />
                      <button className="btn btn-ghost btn-sm" onClick={() => { if (donDraft.address.trim()) { setDonMethods((p) => [...p, { kind: donDraft.kind, address: donDraft.address.trim() }]); setDonDraft({ ...donDraft, address: "" }); } }}>+ Добавить</button>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--ink-dim)", margin: "6px 0 0" }}>Перевод идёт напрямую вам. Указывайте правильную сеть (напр. USDT — только TRC-20).</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveCustomization}>Сохранить</button>
                    {custMsg && <span style={{ fontSize: 12, color: custMsg.includes("✓") ? "var(--green)" : "var(--red)" }}>{custMsg}</span>}
                  </div>
                </>
              )}
            </div>

            {/* Смена пароля */}
            <div className="acc-card">
              <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 14px" }}>Смена пароля</h2>
              <div className="field"><label>Текущий пароль</label>
                <input type="password" autoComplete="current-password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} /></div>
              <div className="field"><label>Новый пароль (мин. 10 символов)</label>
                <input type="password" autoComplete="new-password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} /></div>
              <div className="field"><label>Повтор нового пароля</label>
                <input type="password" autoComplete="new-password" value={pwForm.repeat} onChange={(e) => setPwForm({ ...pwForm, repeat: e.target.value })} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={pwSaving || !pwForm.current || !pwForm.next}>
                  {pwSaving ? "Сохраняем…" : "Сменить пароль"}
                </button>
                {pwMsg && <span style={{ fontSize: 12, color: pwMsg.ok ? "var(--green)" : "var(--red)" }}>{pwMsg.text}</span>}
              </div>
            </div>

            {/* Опасная зона */}
            <div className="acc-card" style={{ border: "1px solid rgba(255,45,111,.3)" }}>
              <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 4px", color: "var(--accent)" }}>Удаление аккаунта</h2>
              <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>
                Аккаунт, профиль, объявления, заказы и слоты будут удалены навсегда. Отменить нельзя.
              </p>
              {!delConfirm ? (
                <button className="btn btn-sm" style={{ background: "rgba(255,45,111,.12)", border: "1px solid rgba(255,45,111,.3)", color: "var(--accent)" }}
                  onClick={() => setDelConfirm(true)}>Удалить аккаунт…</button>
              ) : (
                <div>
                  <div className="field"><label>Подтверди паролем</label>
                    <input type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} style={{ maxWidth: 280 }} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="btn btn-sm" style={{ background: "var(--accent)", border: "none", color: "#fff" }}
                      onClick={deleteAccount} disabled={delBusy || !delPw}>
                      {delBusy ? "Удаляем…" : "Удалить навсегда"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setDelConfirm(false); setDelPw(""); setDelErr(""); }}>Отмена</button>
                    {delErr && <span style={{ fontSize: 12, color: "var(--red)" }}>{delErr}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default: // dashboard
        return (
          <>
            <div className="acc-card" style={{ background: "linear-gradient(135deg,rgba(255,45,111,.12),rgba(124,249,255,.06))", border: "1px solid rgba(255,45,111,.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 6 }}>
                    Добро пожаловать
                  </div>
                  <h2 style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 24, margin: "0 0 6px", letterSpacing: "-.02em" }}>
                    {user.display_name} ✓
                  </h2>
                  <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
                    {user.specialization} · {user.city} · {user.experience} опыта
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {user.profile_id
                    ? <a href={`/people/${user.profile_id}`} className="btn btn-ghost btn-sm">Мой профиль →</a>
                    : <a href="/cabinet?tab=profile" className="btn btn-ghost btn-sm" onClick={(e) => { e.preventDefault(); goTab("profile"); }}>Заполнить профиль →</a>
                  }
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginTop: 20 }}>
                {[
                  { val: followersCount, label: "Подписчиков" },
                  { val: totalLikes, label: "Лайков" },
                  { val: following.length, label: "Подписок" },
                  { val: ordersCount, label: "Заказов" },
                  { val: newIncoming, label: "Откликов" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-.03em" }}>{s.val}</div>
                    <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="acc-card">
              <h3>Лайки по разделам</h3>
              <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "0 0 14px" }}>
                Сколько лайков набрал твой контент — всего <b style={{ color: "var(--ink)" }}>{totalLikes}</b> ♥
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {likeBreakdown.map((b) => (
                  <div key={b.label} style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22, color: "var(--accent-2)" }}>{b.icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-.03em" }}>♥ {b.val}</div>
                      <div style={{ fontFamily: "var(--font-mono),monospace", fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 3 }}>
                        {b.label} · {b.count} шт
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="acc-card">
              <h3>Статус доступности</h3>
              <div className="toggle-row">
                <div>
                  <strong>Open for work</strong>
                  <small>На профиле появится зелёная плашка «Открыт к сотрудничеству»</small>
                </div>
                <div className={`toggle${availForWork ? " on" : ""}`}
                  onClick={() => { const n = !availForWork; setAvailForWork(n); patchProfile({ available_for_work: n }); }}
                  style={{ cursor: "pointer" }} />
              </div>
              <div className="toggle-row">
                <div>
                  <strong>Принимаю личные сообщения</strong>
                  <small>Все пользователи могут написать напрямую</small>
                </div>
                <div className={`toggle${acceptMessages ? " on" : ""}`}
                  onClick={() => { const n = !acceptMessages; setAcceptMessages(n); patchProfile({ accept_messages: n }); }}
                  style={{ cursor: "pointer" }} />
              </div>
            </div>

            {myEvents.length > 0 && (
              <div className="acc-card">
                <h3>Скоро у вас</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {myEvents.map((e) => (
                    <a key={e.id} href={`/events/${e.id}`} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                      background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12,
                      color: "var(--ink)",
                    }}>
                      <div style={{ textAlign: "center", minWidth: 44 }}>
                        <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{e.day}</div>
                        <div style={{ fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase" }}>{e.month}</div>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{e.place ? `${e.place} · ` : ""}{e.city}</div>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--ink-dim)", whiteSpace: "nowrap" }}>{e.going_total} идут</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="acc-card">
              <h3>Быстрый доступ</h3>
              <button onClick={openWorkshopForm}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", width: "100%",
                  background: "linear-gradient(135deg,rgba(255,45,111,.16),rgba(124,249,255,.08))",
                  border: "1px solid rgba(255,45,111,.3)", borderRadius: 11, marginBottom: 10,
                  cursor: "pointer", fontSize: 14, fontWeight: 700, color: "var(--ink)", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>◆</span>
                + Создать мастерскую
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { id: "profile",   icon: "◉", label: "Редактировать профиль" },
                  { id: "roles",     icon: "★", label: "Роли и услуги" },
                  { id: "responses", icon: "↗", label: `Отклики${newIncoming > 0 ? ` (${newIncoming})` : ""}` },
                  { id: "listings",  icon: "⌂", label: "Объявления" },
                ].map((item) => (
                  <button key={item.id} onClick={() => goTab(item.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                      background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 11,
                      cursor: "pointer", fontSize: 13, color: "var(--ink)", textAlign: "left" }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
    }
  }

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <span className="cur">Кабинет</span>
      </div>

      <div className="acc-grid">
        <nav className="acc-nav">
          <div style={{
            display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", marginBottom: 16,
            background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 13,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: user.photo ? `url('${user.photo}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
              flexShrink: 0, border: "2px solid var(--accent)",
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 700, fontSize: 13,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={user.display_name}>
                {user.display_name}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--font-mono),monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.is_pro ? "PRO · " : ""}{user.city}
              </div>
            </div>
          </div>

          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`/cabinet?tab=${item.id}`}
              onClick={(e) => { e.preventDefault(); goTab(item.id); }}
              className={`acc-nav-item${tab === item.id ? " on" : ""}`}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {item.num != null && item.num > 0 && <span className="num">{item.num}</span>}
            </a>
          ))}

          <div style={{ marginTop: 12, padding: "12px 13px", borderTop: "1px solid var(--line)", display: "flex", gap: 12 }}>
            <a href="/" style={{ fontSize: 12, color: "var(--ink-dim)" }}>← На сайт</a>
            <button
              onClick={() => fetch(`/api/v1/auth/logout/`, { method: "POST", credentials: "include" }).finally(() => router.push("/"))}
              style={{ fontSize: 12, color: "var(--ink-dim)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Выйти
            </button>
          </div>
        </nav>

        <div>{renderContent()}</div>
      </div>
    </div>
  );
}

function EmptyBlock({ icon, title, sub, cta }: {
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
