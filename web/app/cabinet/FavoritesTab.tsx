// Вкладка «Избранное» кабинета. Вынесена из page.tsx (god-компонент) —
// чистое отображение, читает проп favorites, removeFavorite — коллбэк.
import EmptyBlock from "./EmptyBlock";

const ROLE_MAP: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};

type Props = {
  favorites: any[];
  removeFavorite: (kind: string, objectId: number) => void;
};

export default function FavoritesTab({ favorites, removeFavorite }: Props) {
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
}
