"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PEOPLE } from "../../lib/mock";

const MOCK_ME = PEOPLE[0];

const ROLE_MAP: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Бишкек", "Ташкент", "Москва", "Другой"];

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

const ORDER_STATUS_COLORS: Record<string, string> = {
  request: "var(--accent-2)", accepted: "var(--green)", in_work: "var(--accent-3)",
  shipped: "#7cf9ff", done: "var(--green)", cancelled: "var(--ink-dim)",
};

type IncomingOrder = {
  id: number; workshop_name: string; customer_username: string;
  description: string; budget: number | null; status: string; status_display: string;
  created_at: string;
};

type Listing = {
  id: number; title: string; description: string; type: string;
  city: string; price: number | null; is_active: boolean; created_at: string;
};

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [me, setMe] = useState<any>(null);
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({ username: "", city: "", experience: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);
  const [availForWork, setAvailForWork] = useState(false);
  const [acceptMessages, setAcceptMessages] = useState(true);
  const [ordersCount, setOrdersCount] = useState(0);
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingForm, setListingForm] = useState({ title: "", type: "job", city: "", description: "", price: "" });
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingSaving, setListingSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState<"avatar" | "cover" | null>(null);

  useEffect(() => {
    setTab(new URLSearchParams(window.location.search).get("tab") || "dashboard");
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/v1/auth/me/`, { credentials: "include" })
      .then((r) => { if (!r.ok) { router.replace("/auth/login"); return null; } return r.json(); })
      .then((data) => {
        if (cancelled || !data) return;
        setMe(data);
        setForm({ username: data.username || "", city: data.city || "", experience: data.experience || "", bio: data.bio || "" });
        setRoles(data.roles || []);
        setAvailForWork(!!data.available_for_work);
        setAcceptMessages(data.accept_messages !== false);
        setAvatarUrl(data.avatar || null);
        setCoverUrl(data.cover || null);
        setAuthed(true);
      })
      .catch(() => router.replace("/auth/login"));

    fetch(`/api/v1/orders/`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const list = data.results ?? data;
        setOrdersCount(Array.isArray(list) ? list.length : 0);
      }).catch(() => {});

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

    return () => { cancelled = true; };
  }, [router]);

  function goTab(id: string) {
    setTab(id);
    window.history.pushState({}, "", `/cabinet?tab=${id}`);
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

  async function patchProfile(patch: Record<string, unknown>) {
    await fetch(`/api/v1/auth/me/`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(patch),
    });
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
    if (!listingForm.title.trim()) return;
    setListingSaving(true);
    try {
      const res = await fetch(`/api/v1/listings/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: listingForm.title,
          type: listingForm.type,
          city: listingForm.city,
          description: listingForm.description,
          price: listingForm.price ? parseInt(listingForm.price) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setListings((prev) => [data, ...prev]);
        setListingForm({ title: "", type: "job", city: "", description: "", price: "" });
        setShowListingForm(false);
      }
    } finally { setListingSaving(false); }
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

  async function deleteListing(id: number) {
    const res = await fetch(`/api/v1/listings/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
  }

  if (!authed) return (
    <div className="wrap" style={{ paddingTop: 60, textAlign: "center", color: "var(--ink-dim)" }}>
      Загрузка...
    </div>
  );

  const user = {
    display_name: me.username || me.email?.split("@")[0] || me.phone || "Пользователь",
    photo: avatarUrl || MOCK_ME.photo,
    is_pro: me.is_pro ?? false,
    city: me.city || "—",
    specialization: roles.length > 0 ? roles.map((r) => ROLE_MAP[r] || r).join(" · ") : "Фанат",
    experience: me.experience || "—",
    profile_id: me.profile_id ?? null,
  };

  const newIncoming = incomingOrders.filter((o) => o.status === "request").length;
  const activeListings = listings.filter((l) => l.is_active).length;

  const NAV_ITEMS = [
    { id: "dashboard", icon: "▤", label: "Обзор" },
    { id: "profile",   icon: "◉", label: "Профиль" },
    { id: "roles",     icon: "★", label: "Роли и услуги" },
    { id: "subs",      icon: "♛", label: "Подписки и доход" },
    { id: "socials",   icon: "⌘", label: "Соцсети" },
    { id: "orders",    icon: "⚒", label: "Заказы",     num: ordersCount || undefined },
    { id: "responses", icon: "↗", label: "Отклики",    num: newIncoming || undefined },
    { id: "favs",      icon: "♥", label: "Избранное" },
    { id: "listings",  icon: "⌂", label: "Объявления", num: activeListings || undefined },
    { id: "settings",  icon: "⚙", label: "Настройки" },
  ];

  function renderContent() {
    switch (tab) {
      case "profile":
        return (
          <div className="acc-card">
            {/* Обложка */}
            <div style={{ position: "relative", marginBottom: 44 }}>
              <div
                style={{
                  height: 130, borderRadius: 12, overflow: "hidden", cursor: "pointer",
                  background: coverUrl ? `url('${coverUrl}') center/cover` : "linear-gradient(135deg,rgba(255,45,111,.2),rgba(124,249,255,.1))",
                  border: "1px solid var(--line)", position: "relative",
                }}
                onClick={() => (document.getElementById("cover-input") as HTMLInputElement)?.click()}
              >
                <div
                  className="photo-overlay"
                  style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", opacity: 0, transition: "opacity .2s", fontSize: 13, color: "#fff", gap: 6 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0")}
                >
                  {photoUploading === "cover" ? "Загружаем..." : "◈ Изменить обложку"}
                </div>
              </div>
              {/* Аватар поверх */}
              <div
                style={{ position: "absolute", bottom: -30, left: 20, width: 64, height: 64, borderRadius: 14, backgroundImage: `url('${user.photo}')`, backgroundSize: "cover", backgroundPosition: "center", border: "3px solid var(--bg)", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,.5)", overflow: "hidden" }}
                onClick={() => (document.getElementById("avatar-input") as HTMLInputElement)?.click()}
                title="Изменить аватар"
              >
                <div
                  style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)", opacity: 0, transition: "opacity .2s", fontSize: 18 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0")}
                >
                  {photoUploading === "avatar" ? "⏳" : "◉"}
                </div>
              </div>
              <input id="avatar-input" type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto("avatar", f); e.target.value = ""; }} />
              <input id="cover-input" type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto("cover", f); e.target.value = ""; }} />
            </div>
            <h3>Базовые данные</h3>
            <div className="field">
              <label>Ник</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Город</label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  <option value="">Не выбран</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
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
              Роли влияют на статистику сайта и видимость в каталогах
            </p>
          </div>
        );

      case "orders":
        return (
          <div className="acc-card">
            <h3>Мои заказы{ordersCount > 0 ? ` (${ordersCount})` : ""}</h3>
            <EmptyBlock icon="⚒" title="Заказов пока нет"
              sub="Когда ты сделаешь заказ в мастерскую — он появится здесь." />
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

      case "listings":
        return (
          <div className="acc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Объявления{listings.length > 0 ? ` (${listings.length})` : ""}</h3>
              <button className="btn btn-primary btn-sm"
                onClick={() => setShowListingForm((v) => !v)}>
                {showListingForm ? "Отмена" : "+ Создать"}
              </button>
            </div>

            {showListingForm && (
              <div style={{ padding: "16px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Тип</label>
                    <select value={listingForm.type} onChange={(e) => setListingForm({ ...listingForm, type: e.target.value })}>
                      {Object.entries(LISTING_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Город</label>
                    <select value={listingForm.city} onChange={(e) => setListingForm({ ...listingForm, city: e.target.value })}>
                      <option value="">Не важно</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
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
                <button className="btn btn-primary" onClick={createListing} disabled={listingSaving || !listingForm.title.trim()}>
                  {listingSaving ? "Публикуем..." : "Опубликовать"}
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
          </div>
        );

      case "favs":
        return (
          <div className="acc-card">
            <h3>Избранное</h3>
            <EmptyBlock icon="♥" title="Список пуст"
              sub="Сохраняй косплееров, мастерские и мудборды — они появятся здесь."
              cta={{ label: "Смотреть косплееров", href: "/people" }} />
          </div>
        );

      case "subs":
      case "socials":
      case "settings":
        return (
          <div className="acc-card">
            <EmptyBlock icon="◆" title="Скоро"
              sub="Этот раздел в разработке. Появится в следующем обновлении." />
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
                  { val: "0", label: "Подписчиков" },
                  { val: "0", label: "Образов" },
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
              <h3>Статус доступности</h3>
              <div className="toggle-row">
                <div>
                  <strong>Open for work</strong>
                  <small>На профиле появится зелёная плашка «Свободен»</small>
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

            <div className="acc-card">
              <h3>Быстрый доступ</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { id: "profile",   icon: "◉", label: "Редактировать профиль" },
                  { id: "roles",     icon: "★", label: "Мои роли" },
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
              backgroundImage: `url('${user.photo}')`,
              backgroundSize: "cover", backgroundPosition: "center",
              flexShrink: 0, border: "2px solid var(--accent)",
            }} />
            <div>
              <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 700, fontSize: 13 }}>
                {user.display_name}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "var(--font-mono),monospace" }}>
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
