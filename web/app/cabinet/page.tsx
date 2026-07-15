"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMascots, type MascotOption } from "../../lib/api";
import { galleryLimit } from "../../lib/roleForms";
import MessagesPanel from "../components/MessagesPanel";
import AnalyticsTab from "./AnalyticsTab";
import EmptyBlock from "./EmptyBlock";
import MatchesTab from "./MatchesTab";
import FavoritesTab from "./FavoritesTab";
import CustomizationTab from "./CustomizationTab";
import CitySelect from "./CitySelect";
import OrdersTab from "./OrdersTab";
import ResponsesTab from "./ResponsesTab";
import ListingsTab from "./ListingsTab";
import ProfileTab from "./ProfileTab";
import RolesTab from "./RolesTab";
import SettingsTab from "./SettingsTab";
import SubsTab from "./SubsTab";
import SocialsTab from "./SocialsTab";
import GalleryTab from "./GalleryTab";
import ShootsTab from "./ShootsTab";
import RentTab from "./RentTab";
import GuidesTab from "./GuidesTab";
import DashboardTab from "./DashboardTab";

const ROLE_MAP: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};


// Анкеты ролей (в RolesTab.tsx): появляются под сеткой ролей при выборе роли.
// Конфиг и рендер полей — общие с админ-панелью (lib/roleForms).
// workshop — отдельная сущность (своя форма в RolesTab.tsx), без анкеты в ROLE_FORMS.

type WsService = { name: string; price_from: string };
type Workshop = {
  id: number; name: string; type: string; city: string; about: string;
  eta: string; rating: number; orders_count: number; is_pro: boolean;
  logo: string | null; cover: string | null;
  phone: string; telegram: string; instagram: string; site: string;
  services: { id: number; name: string; description: string; price_from: number }[];
  photos: { id: number; url: string }[];
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
  const [custMascot, setCustMascot] = useState("");
  const [mascotLib, setMascotLib] = useState<MascotOption[]>([]);
  useEffect(() => { getMascots().then(setMascotLib).catch(() => {}); }, []);
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
  const [myGuides, setMyGuides] = useState<any[] | null>(null);
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
  // Роль-специфичные лого/обложки: {role: {logo, cover}} + индикатор загрузки `${role}:${kind}`.
  const [roleMedia, setRoleMedia] = useState<Record<string, { logo: string | null; cover: string | null }>>({});
  const [roleMediaUploading, setRoleMediaUploading] = useState<string | null>(null);
  const [following, setFollowing] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [activating, setActivating] = useState<string | null>(null);
  const [showWsForm, setShowWsForm] = useState(false);
  const [wsSaving, setWsSaving] = useState(false);
  const [wsErr, setWsErr] = useState("");
  const [wsForm, setWsForm] = useState<{
    name: string; type: string; city: string; eta: string; about: string;
    phone: string; telegram: string; instagram: string; site: string; services: WsService[];
  }>({ name: "", type: "print3d", city: "", eta: "", about: "", phone: "", telegram: "", instagram: "", site: "", services: [{ name: "", price_from: "" }] });

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
        setRoleMedia((data.role_media && typeof data.role_media === "object") ? data.role_media : {});
        setCustSlug(data.slug || "");
        setCustAccent(data.accent_color || "#ff2d6f");
        setCustHide(!!data.hide_from_catalog);
        setCustMascot(data.mascot || "");
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

    fetch(`/api/v1/guides/?mine=1`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { const l = data?.results ?? data; if (!cancelled && Array.isArray(l)) setMyGuides(l); }).catch(() => {});

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
      body: JSON.stringify({ slug: custSlug, accent_color: custAccent, hide_from_catalog: custHide, mascot: custMascot, pinned_look_ids: pinnedIds, donation_methods: donMethods }),
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

  // Доп. фото товара (галерея): до 3, у Pro до 10.
  async function addProductPhoto(productId: number, file: File) {
    if (file.size > 5 * 1024 * 1024) { alert("Фото максимум 5 МБ"); return; }
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(`/api/v1/products/${productId}/photos/`, { method: "POST", credentials: "include", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMyProducts((prev) => prev.map((p) => p.id === productId
        ? { ...p, photos: [...(p.photos || []), { id: data.id, url: data.url }] } : p));
    } else alert(data.detail || "Не удалось загрузить фото");
  }

  async function delProductPhoto(productId: number, photoId: number) {
    const res = await fetch(`/api/v1/products/${productId}/photos/${photoId}/`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) {
      setMyProducts((prev) => prev.map((p) => p.id === productId
        ? { ...p, photos: (p.photos || []).filter((ph: any) => ph.id !== photoId) } : p));
    }
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
          phone: wsForm.phone.trim(), telegram: wsForm.telegram.trim(),
          instagram: wsForm.instagram.trim(), site: wsForm.site.trim(),
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
      setWsForm({ name: "", type: "print3d", city: "", eta: "", about: "", phone: "", telegram: "", instagram: "", site: "", services: [{ name: "", price_from: "" }] });
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

  // Логотип и обложка мастерской — отдельные картинки, шлём PATCH multipart на саму мастерскую.
  const [wsImgUploading, setWsImgUploading] = useState<string | null>(null); // `${wsId}:${kind}`
  async function uploadWsImage(wsId: number, kind: "logo" | "cover", file: File) {
    setWsImgUploading(`${wsId}:${kind}`);
    try {
      const fd = new FormData();
      fd.append(kind, file);
      const res = await fetch(`/api/v1/workshops/${wsId}/`, { method: "PATCH", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWorkshops((prev) => prev.map((w) => w.id === wsId ? { ...w, [kind]: data[kind] } : w));
      } else alert(data.detail || "Не удалось загрузить изображение");
    } finally {
      setWsImgUploading(null);
    }
  }

  // Контакты мастерской: локально правим поле, затем PATCH на сохранение.
  const [wsContactsSaving, setWsContactsSaving] = useState<number | null>(null);
  function setWsField(wsId: number, field: "phone" | "telegram" | "instagram" | "site", value: string) {
    setWorkshops((prev) => prev.map((w) => w.id === wsId ? { ...w, [field]: value } : w));
  }
  async function saveWsContacts(w: Workshop) {
    setWsContactsSaving(w.id);
    try {
      const res = await fetch(`/api/v1/workshops/${w.id}/`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ phone: w.phone || "", telegram: w.telegram || "", instagram: w.instagram || "", site: w.site || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setWorkshops((prev) => prev.map((x) => x.id === w.id ? data : x));
      else alert(data.detail || "Не удалось сохранить контакты");
    } finally {
      setWsContactsSaving(null);
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
    mascot_image: me.mascot_image || null,
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
    { id: "analytics", icon: "◔", label: "Аналитика" },
    { id: "socials",   icon: "⌘", label: "Соцсети" },
    ...(user.is_pro ? [{ id: "custom", icon: "✧", label: "Оформление" }] : []),
    // Фотогалерея — только если роль даёт к ней доступ (косплеер/фотограф/локация).
    ...(galleryLimit(roles, user.is_pro) > 0 ? [{ id: "gallery", icon: "▦", label: "Фотогалерея" }] : []),
    { id: "orders",    icon: "⚒", label: "Заказы",     num: ordersCount || undefined },
    { id: "responses", icon: "↗", label: "Отклики",    num: newIncoming || undefined },
    { id: "messages",  icon: "✉", label: "Сообщения",  num: unreadMsgs || undefined },
    { id: "favs",      icon: "♥", label: "Избранное" },
    { id: "shoots",    icon: "◎", label: "Мои съёмки", num: shootInvites || undefined },
    { id: "rent",      icon: "❖", label: "Прокат",     num: rentalReqCount || undefined },
    ...((roles.some((r) => ["cosplayer", "workshop"].includes(r)) || (myGuides && myGuides.length > 0))
      ? [{ id: "guides", icon: "✎", label: "Мои гайды", num: (myGuides || []).filter((g: any) => g.status === "pending").length || undefined }] : []),
    ...(roles.includes("fan") ? [{ id: "matches", icon: "❤", label: "Единомышленники" }] : []),
    { id: "listings",  icon: "⌂", label: "Объявления", num: activeListings || undefined },
    { id: "settings",  icon: "⚙", label: "Настройки" },
  ];

  // Логотип и обложка КОНКРЕТНОЙ роли (отдельно от общего аватара профиля).
  async function uploadRoleMedia(role: string, kind: "logo" | "cover", file: File) {
    setRoleMediaUploading(`${role}:${kind}`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/profiles/me/role-media/${role}/${kind}/`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRoleMedia((prev) => ({ ...prev, [role]: { ...(prev[role] || { logo: null, cover: null }), [kind]: data.url } }));
      } else alert(data.detail || "Не удалось загрузить изображение");
    } finally {
      setRoleMediaUploading(null);
    }
  }
  async function deleteRoleMedia(role: string, kind: "logo" | "cover") {
    const res = await fetch(`/api/v1/profiles/me/role-media/${role}/${kind}/`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) {
      setRoleMedia((prev) => ({ ...prev, [role]: { ...(prev[role] || { logo: null, cover: null }), [kind]: null } }));
    }
  }

  function renderContent() {
    switch (tab) {
      case "custom":
        return (
          <CustomizationTab
            isPro={user.is_pro}
            custSlug={custSlug} setCustSlug={setCustSlug}
            custAccent={custAccent} setCustAccent={setCustAccent}
            custHide={custHide} setCustHide={setCustHide}
            custMascot={custMascot} setCustMascot={setCustMascot}
            mascotLib={mascotLib}
            myLooks={myLooks}
            pinnedIds={pinnedIds} togglePin={togglePin}
            donMethods={donMethods} setDonMethods={setDonMethods}
            donDraft={donDraft} setDonDraft={setDonDraft}
            custMsg={custMsg}
            saveCustomization={saveCustomization}
          />
        );
      case "profile":
        return (
          <ProfileTab
            coverUrl={coverUrl} avatarUrl={avatarUrl} userPhoto={user.photo}
            photoUploading={photoUploading} uploadPhoto={uploadPhoto} deletePhoto={deletePhoto}
            form={form} setForm={setForm} saveErr={saveErr} saving={saving} saved={saved} saveBasics={saveBasics}
          />
        );

      case "roles":
        return (
          <RolesTab
            isPro={user.is_pro}
            roles={roles} toggleRole={toggleRole}
            rolesLoading={rolesLoading} rolesSaved={rolesSaved}
            roleDetails={roleDetails} setRoleField={setRoleField}
            rdSaving={rdSaving} rdSaved={rdSaved} saveRoleDetails={saveRoleDetails}
            roleMedia={roleMedia} roleMediaUploading={roleMediaUploading}
            uploadRoleMedia={uploadRoleMedia} deleteRoleMedia={deleteRoleMedia}
            myLooks={myLooks} myTeams={myTeams}
            lookForm={lookForm} setLookForm={setLookForm} lookImg={lookImg} setLookImg={setLookImg}
            lookUp={lookUp} lookErr={lookErr} addLook={addLook} delLook={delLook}
            myProducts={myProducts}
            prodForm={prodForm} setProdForm={setProdForm} prodImg={prodImg} setProdImg={setProdImg}
            prodUp={prodUp} prodErr={prodErr} addProduct={addProduct} delProduct={delProduct}
            addProductPhoto={addProductPhoto} delProductPhoto={delProductPhoto}
            mySlots={mySlots} slotForm={slotForm} setSlotForm={setSlotForm}
            slotSaving={slotSaving} slotErr={slotErr} addSlot={addSlot} delSlot={delSlot} decideBooking={decideBooking}
            photos={photos} photoUp={photoUp} photoErr={photoErr}
            uploadGalleryPhoto={uploadGalleryPhoto} deleteGalleryPhoto={deleteGalleryPhoto}
            workshops={workshops} showWsForm={showWsForm} setShowWsForm={setShowWsForm}
            wsSaving={wsSaving} wsErr={wsErr} setWsErr={setWsErr} wsForm={wsForm} setWsForm={setWsForm}
            createWorkshop={createWorkshop} deleteWorkshop={deleteWorkshop}
            wsImgUploading={wsImgUploading} uploadWsImage={uploadWsImage}
            wsContactsSaving={wsContactsSaving} setWsField={setWsField} saveWsContacts={saveWsContacts}
            uploadWsPhoto={uploadWsPhoto} deleteWsPhoto={deleteWsPhoto}
          />
        );

      case "orders":
        return (
          <OrdersTab
            myOrders={myOrders} ordersCount={ordersCount}
            reviewFor={reviewFor} setReviewFor={setReviewFor}
            revRating={revRating} setRevRating={setRevRating}
            revText={revText} setRevText={setRevText}
            revBusy={revBusy} submitReview={submitReview}
          />
        );

      case "responses":
        return <ResponsesTab incomingOrders={incomingOrders} newIncoming={newIncoming} updateIncomingStatus={updateIncomingStatus} />;

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
          <ListingsTab
            meId={me.id ?? null}
            listingScope={listingScope} switchListingScope={switchListingScope}
            showListingForm={showListingForm} setShowListingForm={setShowListingForm} cancelListingForm={cancelListingForm}
            listings={listings} publicListings={publicListings}
            listingForm={listingForm} setListingForm={setListingForm}
            listingSaving={listingSaving} editingListingId={editingListingId}
            createListing={createListing} startEditListing={startEditListing}
            toggleListingActive={toggleListingActive} deleteListing={deleteListing}
          />
        );

      case "favs":
        return <FavoritesTab favorites={favorites} removeFavorite={removeFavorite} />;

      case "subs":
        return (
          <SubsTab
            isPro={user.is_pro} proActiveUntil={user.pro_active_until}
            activating={activating} activatePlan={activatePlan}
            following={following} followersCount={followersCount} unfollow={unfollow}
          />
        );

      case "analytics":
        return <AnalyticsTab analytics={analytics} viewers={viewers} orderLabels={ORDER_STATUS_LABELS} />;

      case "socials":
        return (
          <SocialsTab
            socials={socials} setSocials={setSocials}
            saveSocials={saveSocials} socialsSaving={socialsSaving} socialsSaved={socialsSaved}
          />
        );

      case "gallery":
        return (
          <GalleryTab
            roles={roles} isPro={user.is_pro}
            photos={photos} photoUp={photoUp} photoErr={photoErr}
            uploadGalleryPhoto={uploadGalleryPhoto} deleteGalleryPhoto={deleteGalleryPhoto}
            goToRoles={() => setTab("roles")}
          />
        );

      case "shoots":
        return <ShootsTab myShoots={myShoots} />;

      case "rent":
        return <RentTab myCostumes={myCostumes} setMyCostumes={setMyCostumes} myRentals={myRentals} />;

      case "guides":
        return <GuidesTab myGuides={myGuides} setMyGuides={setMyGuides} />;

      case "matches":
        return <MatchesTab matches={matches} matchesReady={matchesReady} followMatch={followMatch} />;

      case "settings":
        return (
          <SettingsTab
            me={me}
            emStep={emStep} setEmStep={setEmStep} emNew={emNew} setEmNew={setEmNew}
            emCode={emCode} setEmCode={setEmCode} emBusy={emBusy} emMsg={emMsg} setEmMsg={setEmMsg}
            requestEmailChange={requestEmailChange} confirmEmailChange={confirmEmailChange}
            availForWork={availForWork} setAvailForWork={setAvailForWork}
            acceptMessages={acceptMessages} setAcceptMessages={setAcceptMessages}
            patchProfile={patchProfile}
            pwForm={pwForm} setPwForm={setPwForm} pwSaving={pwSaving} pwMsg={pwMsg} changePassword={changePassword}
            delConfirm={delConfirm} setDelConfirm={setDelConfirm} delPw={delPw} setDelPw={setDelPw}
            delBusy={delBusy} delErr={delErr} setDelErr={setDelErr} deleteAccount={deleteAccount}
          />
        );

      default: // dashboard
        return (
          <DashboardTab
            user={user} goTab={goTab}
            followersCount={followersCount} totalLikes={totalLikes} followingCount={following.length}
            ordersCount={ordersCount} newIncoming={newIncoming} likeBreakdown={likeBreakdown}
            availForWork={availForWork} setAvailForWork={setAvailForWork}
            acceptMessages={acceptMessages} setAcceptMessages={setAcceptMessages}
            patchProfile={patchProfile} myEvents={myEvents} openWorkshopForm={openWorkshopForm}
          />
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
