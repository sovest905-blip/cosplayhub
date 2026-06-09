"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FeedItem = {
  type: "look" | "event" | "news";
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  url: string;
  author?: string;
  reason: string;
};

const TYPE_META: Record<string, { icon: string; label: string }> = {
  look: { icon: "✧", label: "Образ" },
  event: { icon: "◈", label: "Событие" },
  news: { icon: "◆", label: "Новость" },
};

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [personalized, setPersonalized] = useState(true);

  useEffect(() => {
    fetch("/api/v1/feed/", { credentials: "include" })
      .then((r) => {
        if (r.status === 403) { router.replace("/auth/login?next=/feed"); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d) { setItems(d.items || []); setPersonalized(d.personalized !== false); } })
      .catch(() => setItems([]));
  }, [router]);

  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">моя лента</div>
        <h1 className="huge" style={{ fontSize: "clamp(30px,5vw,56px)" }}>
          Лента <span className="accent">для тебя.</span>
        </h1>
        <p style={{ color: "var(--ink-dim)", maxWidth: 560, marginTop: 12 }}>
          {personalized
            ? "Образы тех, на кого ты подписан, по твоим фандомам и ближайшие события."
            : "Заполни фандомы в анкете и подпишись на косплееров — лента станет личной."}
        </p>
      </section>

      <section style={{ paddingTop: 28 }}>
        {items === null ? (
          <p style={{ color: "var(--ink-dim)" }}>Загрузка…</p>
        ) : items.length === 0 ? (
          <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18 }}>
            <div className="empty-glyph">✦</div>
            <p className="empty-title">Пока пусто</p>
            <p className="empty-sub">Подпишись на косплееров и заполни любимые фандомы — лента оживёт.</p>
            <a href="/looks" className="btn btn-ghost" style={{ marginTop: 8 }}>Смотреть образы →</a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
            {items.map((it) => {
              const meta = TYPE_META[it.type];
              return (
                <a key={`${it.type}-${it.id}`} href={it.url} className="ws-card">
                  <div className="ws-cover" style={{
                    backgroundImage: it.image ? `url('${it.image}')` : "linear-gradient(135deg,rgba(255,45,111,.18),rgba(124,249,255,.08))",
                  }}>
                    <div className="ws-type">{meta.icon} {meta.label}</div>
                  </div>
                  <div className="ws-body">
                    <div className="ws-name">{it.title}</div>
                    {it.subtitle && <div className="ws-loc">{it.subtitle}</div>}
                    <div style={{
                      marginTop: 8, fontSize: 11, color: "var(--accent-2)",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      ✦ {it.reason}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
