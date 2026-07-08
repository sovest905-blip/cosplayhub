// Вкладка «Аналитика» кабинета. Вынесена из page.tsx (god-компонент) — чистое
// отображение, читает только пропсы analytics/viewers (фетчатся в page.tsx).
type Props = {
  analytics: any;
  viewers: any;
  orderLabels: Record<string, string>;
};

export default function AnalyticsTab({ analytics, viewers, orderLabels }: Props) {
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
                      {orderLabels[st] || st}: <b style={{ color: "var(--ink)" }}>{n}</b>
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
