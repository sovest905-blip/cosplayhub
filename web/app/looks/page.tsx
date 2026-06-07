import { getLooks, type LookItem } from "../../lib/api";
import LikeButton from "../components/LikeButton";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

const PLACEHOLDER = "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=600&q=80";

export default async function LooksPage() {
  const looks = (await getLooks().catch(() => null)) || [];

  if (looks.length === 0) {
    return (
      <ComingSoon icon="✧" title="Образы"
        desc="Галерея косплей-образов: работы участников, теги по персонажам, лайки. Добавь свой образ в кабинете (роль «Косплеер»)." />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Образы</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Образы</h1>
        <a href="/cabinet?tab=roles" className="btn btn-primary btn-sm">+ Добавить образ</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
        {looks.map((l: LookItem) => (
          <article key={l.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ aspectRatio: "3/4", backgroundSize: "cover", backgroundPosition: "center",
              backgroundImage: `url('${l.image || PLACEHOLDER}')` }} />
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>{l.title}</h3>
              {l.character && <div style={{ fontSize: 12, color: "var(--accent-2)" }}>{l.character}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
                {l.author_id
                  ? <a href={`/people/${l.author_id}`} style={{ fontSize: 12, color: "var(--ink-dim)" }}>@{l.author_name}</a>
                  : <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>@{l.author_name}</span>}
                <LikeButton lookId={l.id} initialLiked={l.is_liked} initialCount={l.likes_count} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
