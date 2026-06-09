"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { id: number; username?: string; email?: string | null; is_staff?: boolean } | null;

export default function AuthNav() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [ready, setReady] = useState(false);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setMe(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  // Пуллинг счётчиков (сообщения + уведомления) каждые 20 сек, пока залогинен
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    async function poll() {
      try {
        const [m, n] = await Promise.all([
          fetch("/api/v1/messages/unread-count/", { credentials: "include" }).then((r) => r.ok ? r.json() : { count: 0 }),
          fetch("/api/v1/notifications/unread-count/", { credentials: "include" }).then((r) => r.ok ? r.json() : { count: 0 }),
        ]);
        if (!cancelled) { setUnreadMsg(m.count || 0); setUnreadNotif(n.count || 0); }
      } catch { /* ignore */ }
    }
    poll();
    const id = setInterval(poll, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [me]);

  async function logout() {
    try {
      await fetch("/api/v1/auth/logout/", { method: "POST", credentials: "include" });
    } finally {
      setMe(null);
      router.push("/");
      router.refresh();
    }
  }

  if (!ready) return <div style={{ width: 96 }} />;

  if (!me) {
    return (
      <div className="auth-nav">
        <a href="/auth/login" className="btn btn-primary btn-sm" style={{ whiteSpace: "nowrap" }}>
          Войти
        </a>
      </div>
    );
  }

  const initial = (me.username || me.email || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="auth-nav">
      {me.is_staff && (
        <a href="/admin-panel" className="btn btn-ghost btn-sm" title="Админ-панель"
          style={{ whiteSpace: "nowrap", borderColor: "rgba(124,249,255,.3)", color: "var(--accent-2)" }}>
          ⚙ Админка
        </a>
      )}
      <a href="/feed" className="btn btn-ghost btn-sm" title="Моя лента" style={{ whiteSpace: "nowrap" }}>
        ✦ Лента
      </a>
      <a href="/messages" className="icon-btn" title="Сообщения" style={{ position: "relative" }}>
        💬
        {unreadMsg > 0 && <Badge n={unreadMsg} />}
      </a>
      <a href="/notifications" className="icon-btn" title="Уведомления" style={{ position: "relative" }}>
        🔔
        {unreadNotif > 0 && <Badge n={unreadNotif} />}
      </a>
      <a href="/cabinet" className="me-btn" title="Кабинет">
        <div className="me-av avail">{initial}</div>
        <div className="me-name">Кабинет</div>
      </a>
      <button
        onClick={logout}
        className="icon-btn"
        title="Выйти"
        aria-label="Выйти"
        style={{ fontSize: 15 }}
      >
        ⎋
      </button>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span style={{
      position: "absolute", top: -4, right: -4,
      minWidth: 16, height: 16, padding: "0 4px",
      borderRadius: 8, background: "var(--accent)", color: "#fff",
      fontSize: 10, fontWeight: 700, lineHeight: "16px", textAlign: "center",
      fontFamily: "var(--font-mono),monospace",
    }}>
      {n > 9 ? "9+" : n}
    </span>
  );
}
