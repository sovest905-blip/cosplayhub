"use client";
import { useEffect, useState } from "react";

type Notification = {
  id: number;
  kind: string;
  text: string;
  url: string;
  is_read: boolean;
  created_at: string;
};

const KIND_ICON: Record<string, string> = {
  message: "💬", order_new: "⚒", order_status: "↻", system: "◆",
};

function timeAgo(iso: string) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "только что";
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
  } catch { return ""; }
}

export default function NotificationsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed !== true) return;
    fetch("/api/v1/notifications/", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
    // Помечаем все прочитанными при заходе
    fetch("/api/v1/notifications/mark-read/", { method: "POST", credentials: "include" }).catch(() => {});
  }, [authed]);

  if (authed === false) {
    return (
      <div className="wrap" style={{ paddingTop: 60, textAlign: "center" }}>
        <p style={{ color: "var(--ink-dim)", marginBottom: 16 }}>Войдите, чтобы видеть уведомления.</p>
        <a href="/auth/login?next=/notifications" className="btn btn-primary">Войти</a>
      </div>
    );
  }
  if (authed === null) {
    return <div className="wrap" style={{ paddingTop: 60, textAlign: "center", color: "var(--ink-dim)" }}>Загрузка...</div>;
  }

  return (
    <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Уведомления</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 26, fontWeight: 800, margin: "8px 0 20px" }}>
        Уведомления
      </h1>

      {items.length === 0 ? (
        <div className="empty-state" style={{ border: "1px solid var(--line)", borderRadius: 18 }}>
          <div className="empty-glyph">🔔</div>
          <p className="empty-title">Уведомлений пока нет</p>
          <p className="empty-sub">Здесь появятся новые сообщения, заказы и изменения статусов.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
          {items.map((n) => {
            const inner = (
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px",
                background: n.is_read ? "var(--bg-2)" : "rgba(255,45,111,.06)",
                border: `1px solid ${n.is_read ? "var(--line)" : "rgba(255,45,111,.2)"}`,
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{KIND_ICON[n.kind] || "◆"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 3, fontFamily: "var(--font-mono),monospace" }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {n.url && <span style={{ color: "var(--ink-dim)", fontSize: 16 }}>→</span>}
              </div>
            );
            return n.url
              ? <a key={n.id} href={n.url} style={{ textDecoration: "none", color: "inherit" }}>{inner}</a>
              : <div key={n.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
