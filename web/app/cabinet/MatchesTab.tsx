// Вкладка «Единомышленники» кабинета. Вынесена из page.tsx (god-компонент) —
// чистое отображение, читает пропсы matches/matchesReady, followMatch — коллбэк.
import EmptyBlock from "./EmptyBlock";

type Match = {
  user_id: number; profile_id: number; display_name: string; city?: string;
  avatar?: string; shared_fandoms: string[]; shared_hobbies: string[]; is_following: boolean;
};

type Props = {
  matches: Match[] | null;
  matchesReady: boolean;
  followMatch: (userId: number) => void;
};

export default function MatchesTab({ matches, matchesReady, followMatch }: Props) {
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
}
