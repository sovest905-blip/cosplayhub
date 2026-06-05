"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { id: number; username?: string; email?: string | null } | null;

export default function AuthNav() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setMe(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  async function logout() {
    try {
      await fetch("/api/v1/auth/logout/", { method: "POST", credentials: "include" });
    } finally {
      setMe(null);
      router.push("/");
      router.refresh();
    }
  }

  // До ответа /me не мигаем — резервируем место
  if (!ready) return <div style={{ width: 96 }} />;

  // Аноним: только кнопка «Войти»
  if (!me) {
    return (
      <a href="/auth/login" className="btn btn-primary btn-sm" style={{ whiteSpace: "nowrap" }}>
        Войти
      </a>
    );
  }

  // Залогинен: сообщения, уведомления, аватар→кабинет, выйти
  const initial = (me.username || me.email || "?").trim().charAt(0).toUpperCase();
  return (
    <>
      <button className="icon-btn" title="Сообщения">💬</button>
      <button className="icon-btn" title="Уведомления">🔔</button>
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
    </>
  );
}
