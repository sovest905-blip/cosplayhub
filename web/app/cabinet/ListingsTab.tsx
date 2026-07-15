// Вкладка «Объявления» кабинета. Вынесена из page.tsx (god-компонент).
import EmptyBlock from "./EmptyBlock";
import CitySelect from "./CitySelect";

const LISTING_TYPES: Record<string, string> = {
  job: "Ищу специалиста", collab: "Коллаборация", sell: "Продаю", buy: "Куплю",
};

const LISTING_SECTION: Record<string, { name: string; href: string }> = {
  sell:   { name: "Барахолка", href: "/market" },
  buy:    { name: "Барахолка", href: "/market" },
  job:    { name: "Слоты", href: "/jobs" },
  collab: { name: "Слоты", href: "/jobs" },
};

type Listing = {
  id: number; title: string; description: string; type: string;
  city: string; price: number | null; contact: string; is_active: boolean; created_at: string;
};

type ListingForm = { title: string; type: string; city: string; description: string; price: string; contact: string };

type Props = {
  meId: number | null;
  listingScope: "mine" | "all"; switchListingScope: (scope: "mine" | "all") => void;
  showListingForm: boolean; setShowListingForm: (v: boolean) => void; cancelListingForm: () => void;
  listings: Listing[];
  publicListings: any[] | null;
  listingForm: ListingForm; setListingForm: (v: ListingForm) => void;
  listingSaving: boolean;
  editingListingId: number | null;
  createListing: () => void;
  startEditListing: (listing: Listing) => void;
  toggleListingActive: (id: number, current: boolean) => void;
  deleteListing: (id: number) => void;
};

export default function ListingsTab({
  meId, listingScope, switchListingScope, showListingForm, setShowListingForm, cancelListingForm,
  listings, publicListings, listingForm, setListingForm, listingSaving, editingListingId,
  createListing, startEditListing, toggleListingActive, deleteListing,
}: Props) {
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
                  {meId && l.owner_id === meId && (
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
}
