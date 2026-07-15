// Вкладка «Роли» кабинета — самая тяжёлая (роли + анкеты ролей + мастерские + вложенные
// блоки товаров/слотов/образов/галереи). Вынесена из page.tsx (god-компонент) как единый
// компонент: все render-хелперы (renderRoleForm/roleMediaBlock/looksBlock/productsBlock/
// slotsBlock/galleryBlock) переехали внутрь, но fetch-логика осталась в page.tsx и приходит
// сюда пропсами — компонент только отображает и вызывает колбэки.
import type { CSSProperties } from "react";
import { ROLE_FORMS, RoleFields, galleryLimit } from "../../lib/roleForms";
import EmptyBlock from "./EmptyBlock";
import CitySelect from "./CitySelect";

const ALL_ROLES = [
  { slug: "cosplayer",    icon: "◉", name: "Косплеер",   desc: "Создаёшь образы"  },
  { slug: "photographer", icon: "◐", name: "Фотограф",   desc: "Снимаешь"          },
  { slug: "workshop",     icon: "◆", name: "Мастерская", desc: "Шьёшь, печатаешь" },
  { slug: "shop",         icon: "⌂", name: "Магазин",    desc: "Продаёшь товары"  },
  { slug: "location",     icon: "⌖", name: "Локация",    desc: "Сдаёшь студию"    },
  { slug: "fan",          icon: "♥", name: "Фанат",      desc: "Смотришь"          },
];

const WORKSHOP_TYPES: Record<string, string> = {
  print3d: "3D-печать", eva: "EVA-пена", sewing: "Пошив", wigs: "Парики",
};

type WsService = { name: string; price_from: string };
type Workshop = {
  id: number; name: string; type: string; city: string; about: string;
  eta: string; rating: number; orders_count: number; is_pro: boolean;
  logo: string | null; cover: string | null;
  phone: string; telegram: string; instagram: string; site: string;
  services: { id: number; name: string; description: string; price_from: number }[];
  photos: { id: number; url: string }[];
};

type Props = {
  isPro: boolean;
  roles: string[]; toggleRole: (slug: string) => void;
  rolesLoading: boolean; rolesSaved: boolean;
  roleDetails: Record<string, Record<string, any>>; setRoleField: (role: string, key: string, value: any) => void;
  rdSaving: string | null; rdSaved: string | null; saveRoleDetails: (role: string) => void;
  roleMedia: Record<string, { logo: string | null; cover: string | null }>;
  roleMediaUploading: string | null;
  uploadRoleMedia: (role: string, kind: "logo" | "cover", file: File) => void;
  deleteRoleMedia: (role: string, kind: "logo" | "cover") => void;

  // «Мои образы» (косплеер)
  myLooks: any[]; myTeams: any[];
  lookForm: { title: string; character: string; team: string; stage: string }; setLookForm: (v: any) => void;
  lookImg: File | null; setLookImg: (f: File | null) => void;
  lookUp: boolean; lookErr: string; addLook: () => void; delLook: (id: number) => void;

  // «Мои товары» (магазин)
  myProducts: any[];
  prodForm: { title: string; price: string; category: string; status: string; description: string }; setProdForm: (v: any) => void;
  prodImg: File | null; setProdImg: (f: File | null) => void;
  prodUp: boolean; prodErr: string; addProduct: () => void; delProduct: (id: number) => void;
  addProductPhoto: (productId: number, file: File) => void; delProductPhoto: (productId: number, photoId: number) => void;

  // «Слоты аренды» (локация)
  mySlots: any[];
  slotForm: { title: string; date: string; time_start: string; time_end: string; price: string }; setSlotForm: (v: any) => void;
  slotSaving: boolean; slotErr: string; addSlot: () => void; delSlot: (id: number) => void;
  decideBooking: (bookingId: number, status: "approved" | "declined") => void;

  // Фотогалерея (косплеер/фотограф/локация)
  photos: { id: number; url: string }[];
  photoUp: boolean; photoErr: string;
  uploadGalleryPhoto: (file: File) => void; deleteGalleryPhoto: (id: number) => void;

  // Мастерские
  workshops: Workshop[];
  showWsForm: boolean; setShowWsForm: (v: boolean | ((p: boolean) => boolean)) => void;
  wsSaving: boolean; wsErr: string; setWsErr: (v: string) => void;
  wsForm: { name: string; type: string; city: string; eta: string; about: string; phone: string; telegram: string; instagram: string; site: string; services: WsService[] };
  setWsForm: (v: any) => void;
  createWorkshop: () => void; deleteWorkshop: (id: number) => void;
  wsImgUploading: string | null; uploadWsImage: (wsId: number, kind: "logo" | "cover", file: File) => void;
  wsContactsSaving: number | null;
  setWsField: (wsId: number, field: "phone" | "telegram" | "instagram" | "site", value: string) => void;
  saveWsContacts: (w: Workshop) => void;
  uploadWsPhoto: (wsId: number, file: File) => void; deleteWsPhoto: (wsId: number, photoId: number) => void;
};

export default function RolesTab(props: Props) {
  const {
    isPro, roles, toggleRole, rolesLoading, rolesSaved, roleDetails, setRoleField, rdSaving, rdSaved, saveRoleDetails,
    roleMedia, roleMediaUploading, uploadRoleMedia, deleteRoleMedia,
    myLooks, myTeams, lookForm, setLookForm, lookImg, setLookImg, lookUp, lookErr, addLook, delLook,
    myProducts, prodForm, setProdForm, prodImg, setProdImg, prodUp, prodErr, addProduct, delProduct, addProductPhoto, delProductPhoto,
    mySlots, slotForm, setSlotForm, slotSaving, slotErr, addSlot, delSlot, decideBooking,
    photos, photoUp, photoErr, uploadGalleryPhoto, deleteGalleryPhoto,
    workshops, showWsForm, setShowWsForm, wsSaving, wsErr, setWsErr, wsForm, setWsForm, createWorkshop, deleteWorkshop,
    wsImgUploading, uploadWsImage, wsContactsSaving, setWsField, saveWsContacts, uploadWsPhoto, deleteWsPhoto,
  } = props;

  function roleMediaBlock(role: string) {
    const rm = roleMedia[role] || { logo: null, cover: null };
    const rmLink: CSSProperties = {
      fontSize: 11, color: "var(--accent)", background: "none", border: "none",
      cursor: "pointer", padding: "4px 0 0", display: "block",
    };
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", marginBottom: 6 }}>Логотип роли</div>
          <label style={{
            width: 64, height: 64, borderRadius: 10, cursor: "pointer",
            border: "1px dashed var(--line)", backgroundSize: "cover", backgroundPosition: "center",
            backgroundImage: rm.logo ? `url('${rm.logo}')` : undefined,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink-dim)", fontSize: 11, textAlign: "center",
          }}>
            {roleMediaUploading === `${role}:logo` ? "…" : (rm.logo ? "" : "+ лого")}
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRoleMedia(role, "logo", f); e.target.value = ""; }} />
          </label>
          {rm.logo && <button style={rmLink} onClick={() => deleteRoleMedia(role, "logo")}>убрать</button>}
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", marginBottom: 6 }}>Обложка роли</div>
          <label style={{
            display: "flex", height: 64, borderRadius: 10, cursor: "pointer",
            border: "1px dashed var(--line)", backgroundSize: "cover", backgroundPosition: "center",
            backgroundImage: rm.cover ? `url('${rm.cover}')` : undefined,
            alignItems: "center", justifyContent: "center", color: "var(--ink-dim)", fontSize: 11,
          }}>
            {roleMediaUploading === `${role}:cover` ? "…" : (rm.cover ? "" : "+ обложка")}
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRoleMedia(role, "cover", f); e.target.value = ""; }} />
          </label>
          {rm.cover && <button style={rmLink} onClick={() => deleteRoleMedia(role, "cover")}>убрать</button>}
        </div>
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
        <div className="field"><label>Обложка (главное фото)</label><input type="file" accept="image/*" onChange={(e) => setProdImg(e.target.files?.[0] || null)} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={addProduct} disabled={prodUp}>{prodUp ? "Сохраняем…" : "+ Добавить товар"}</button>
          {prodErr && <span style={{ color: "var(--red)", fontSize: 12 }}>{prodErr}</span>}
        </div>
        {myProducts.length > 0 && (() => {
          const photoLimit = isPro ? 10 : 3;
          return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myProducts.map((p) => {
              const cover = p.image || p.image_url || "https://images.unsplash.com/photo-1513094735237-8f2714d57c13?w=300&q=80";
              const count = (p.photos || []).length;
              return (
              <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 10, display: "flex", gap: 12 }}>
                <div style={{ width: 74, height: 74, flex: "0 0 auto", borderRadius: 8, backgroundSize: "cover", backgroundPosition: "center",
                  backgroundImage: `url('${cover}')` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                    <button onClick={() => delProduct(p.id)} className="btn btn-ghost btn-sm">Удалить</button>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8 }}>
                    {p.price ? `${Number(p.price).toLocaleString("ru-RU")} ₸` : "по запросу"} · {p.status_display}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {(p.photos || []).map((ph: any) => (
                      <div key={ph.id} style={{ position: "relative", width: 44, height: 44, borderRadius: 6, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${ph.url}')` }}>
                        <button onClick={() => delProductPhoto(p.id, ph.id)} title="Удалить фото"
                          style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "none",
                            background: "rgba(0,0,0,.75)", color: "#fff", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                    {count < photoLimit ? (
                      <label style={{ width: 44, height: 44, borderRadius: 6, border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "var(--ink-dim)" }}>
                        +
                        <input type="file" accept="image/*" style={{ display: "none" }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) addProductPhoto(p.id, f); e.currentTarget.value = ""; }} />
                      </label>
                    ) : null}
                    <span style={{ fontSize: 11, color: "var(--ink-dim)", marginLeft: 4 }}>
                      Фото {count}/{photoLimit}{!isPro && count >= photoLimit ? " · Pro поднимает до 10" : ""}
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          );
        })()}
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
    const limit = galleryLimit(roles, isPro);
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>{title}</h4>
          <span style={{ fontSize: 12, color: photos.length >= limit ? "var(--accent-3)" : "var(--ink-dim)" }}>
            {photos.length} / {limit}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>{hint} До {limit} фото, каждое ≤5 МБ.</p>
        {!isPro && photos.length >= limit && (
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

        {role === "cosplayer" && (
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "10px 12px", marginBottom: 14, borderRadius: 10,
            background: "rgba(255,210,74,.08)", border: "1px solid rgba(255,210,74,.3)",
          }}>
            <span style={{ fontSize: 15, lineHeight: 1.2 }}>ℹ️</span>
            <p style={{ fontSize: 12.5, color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>
              Чтобы попасть в каталог косплееров и на главную, добавь <b>аватар</b> и
              хотя бы <b>один образ или фото в галерею</b>. Пустые анкеты (без аватара
              и без фото) в списках не показываются.
            </p>
          </div>
        )}

        {roleMediaBlock(role)}

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

            <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 8 }}>Контакты для связи (необязательно)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>Телефон / WhatsApp</label>
                <input value={wsForm.phone} placeholder="+7 700 000 00 00"
                  onChange={(e) => setWsForm({ ...wsForm, phone: e.target.value })} /></div>
              <div className="field"><label>Telegram</label>
                <input value={wsForm.telegram} placeholder="@workshop или ссылка"
                  onChange={(e) => setWsForm({ ...wsForm, telegram: e.target.value })} /></div>
              <div className="field"><label>Instagram</label>
                <input value={wsForm.instagram} placeholder="@workshop или ссылка"
                  onChange={(e) => setWsForm({ ...wsForm, instagram: e.target.value })} /></div>
              <div className="field"><label>Сайт</label>
                <input value={wsForm.site} placeholder="https://..."
                  onChange={(e) => setWsForm({ ...wsForm, site: e.target.value })} /></div>
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
                    <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginBottom: 6 }}>Логотип</div>
                        <label style={{
                          width: 64, height: 64, borderRadius: 10, cursor: "pointer",
                          border: "1px dashed var(--line)", backgroundSize: "cover", backgroundPosition: "center",
                          backgroundImage: w.logo ? `url('${w.logo}')` : undefined,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--ink-dim)", fontSize: 11, textAlign: "center",
                        }}>
                          {wsImgUploading === `${w.id}:logo` ? "…" : (w.logo ? "" : "+ лого")}
                          <input type="file" accept="image/*" style={{ display: "none" }}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWsImage(w.id, "logo", f); e.target.value = ""; }} />
                        </label>
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginBottom: 6 }}>Обложка</div>
                        <label style={{
                          display: "flex", height: 64, borderRadius: 10, cursor: "pointer",
                          border: "1px dashed var(--line)", backgroundSize: "cover", backgroundPosition: "center",
                          backgroundImage: w.cover ? `url('${w.cover}')` : undefined,
                          alignItems: "center", justifyContent: "center", color: "var(--ink-dim)", fontSize: 11,
                        }}>
                          {wsImgUploading === `${w.id}:cover` ? "…" : (w.cover ? "" : "+ обложка")}
                          <input type="file" accept="image/*" style={{ display: "none" }}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadWsImage(w.id, "cover", f); e.target.value = ""; }} />
                        </label>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-dim)", marginBottom: 6 }}>Контакты для связи</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input value={w.phone || ""} placeholder="Телефон / WhatsApp"
                          onChange={(e) => setWsField(w.id, "phone", e.target.value)} />
                        <input value={w.telegram || ""} placeholder="Telegram (@ или ссылка)"
                          onChange={(e) => setWsField(w.id, "telegram", e.target.value)} />
                        <input value={w.instagram || ""} placeholder="Instagram (@ или ссылка)"
                          onChange={(e) => setWsField(w.id, "instagram", e.target.value)} />
                        <input value={w.site || ""} placeholder="Сайт (https://...)"
                          onChange={(e) => setWsField(w.id, "site", e.target.value)} />
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                        disabled={wsContactsSaving === w.id} onClick={() => saveWsContacts(w)}>
                        {wsContactsSaving === w.id ? "Сохраняем…" : "Сохранить контакты"}
                      </button>
                    </div>

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
}
