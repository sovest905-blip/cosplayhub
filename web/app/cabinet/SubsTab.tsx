// Вкладка «Подписки и доход» кабинета (Pro-тариф + мои подписки на людей/мастерские).
// Вынесена из page.tsx (god-компонент).
import EmptyBlock from "./EmptyBlock";
import CryptoPayButton from "../components/CryptoPayButton";

const ROLE_MAP: Record<string, string> = {
  cosplayer: "Косплеер", photographer: "Фотограф", workshop: "Мастерская",
  shop: "Магазин", location: "Локация", fan: "Фанат",
};

type Props = {
  isPro: boolean; proActiveUntil: string | null;
  activating: string | null; activatePlan: () => void;
  following: any[]; followersCount: number; unfollow: (userId: number) => void;
};

export default function SubsTab({ isPro, proActiveUntil, activating, activatePlan, following, followersCount, unfollow }: Props) {
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
              {isPro
                ? <span style={{ color: "var(--green)" }}>Активен{proActiveUntil ? ` до ${fmt(proActiveUntil)}` : " · бессрочно"}</span>
                : "Синяя галочка, приоритет в каталоге и поиске, аналитика, boost мастерских"}
            </div>
          </div>
          {isPro
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
