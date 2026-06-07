"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const SECTIONS = [
  {
    title: "Люди",
    links: [
      { href: "/people", label: "Косплееры" },
      { href: "/people?role=photo", label: "Фотографы" },
      { href: "/looks", label: "Образы" },
      { href: "/teams", label: "Команды" },
    ],
  },
  {
    title: "Услуги",
    links: [
      { href: "/workshops", label: "Мастерские" },
      { href: "/shops", label: "Магазины" },
      { href: "/jobs", label: "Слоты" },
      { href: "/locations", label: "Локации" },
    ],
  },
  {
    title: "Сообщество",
    links: [
      { href: "/events", label: "События" },
      { href: "/guides", label: "Гайды" },
      { href: "/market", label: "Барахолка" },
      { href: "/moodboards", label: "Доски" },
    ],
  },
];

export default function MobileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then(async (r) => {
        setAuthed(r.ok);
        if (r.ok) {
          try { const me = await r.json(); setIsStaff(!!me.is_staff); } catch { /* ignore */ }
          // счётчики непрочитанного — только для залогиненных
          fetch("/api/v1/messages/unread-count/", { credentials: "include" })
            .then((x) => x.ok ? x.json() : { count: 0 }).then((d) => setUnreadMsg(d.count || 0)).catch(() => {});
          fetch("/api/v1/notifications/unread-count/", { credentials: "include" })
            .then((x) => x.ok ? x.json() : { count: 0 }).then((d) => setUnreadNotif(d.count || 0)).catch(() => {});
        }
      })
      .catch(() => setAuthed(false));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  async function logout() {
    try {
      await fetch("/api/v1/auth/logout/", { method: "POST", credentials: "include" });
    } finally {
      setOpen(false);
      router.push("/");
      router.refresh();
    }
  }

  const linkStyle: React.CSSProperties = {
    display: "block", padding: "11px 4px", fontSize: 15, color: "var(--ink)",
    borderBottom: "1px solid var(--line)",
  };
  const headStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono),monospace", fontSize: 11, color: "var(--ink-dim)",
    textTransform: "uppercase", letterSpacing: ".15em", margin: "22px 0 6px",
  };

  return (
    <>
      <button className="burger" aria-label="Меню" onClick={() => setOpen(true)}>☰</button>

      {open && mounted && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: 0, right: 0, height: "100%",
              width: "min(330px, 86vw)", background: "var(--bg-2)",
              borderLeft: "1px solid var(--line)", padding: "18px 22px 40px",
              overflowY: "auto", display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 900, fontSize: 15 }}>
                КОСПЛЕЙ.ХАБ
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                style={{ background: "none", border: "none", color: "var(--ink-dim)", fontSize: 24, lineHeight: 1, cursor: "pointer", padding: 4 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitSearch} style={{ margin: "12px 0 4px", display: "flex", gap: 8 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск косплееров, мастерских..."
                autoComplete="off"
                style={{
                  flex: 1, background: "var(--bg)", border: "1px solid var(--line)",
                  borderRadius: 10, padding: "10px 13px", color: "var(--ink)",
                  fontSize: 14, fontFamily: "inherit",
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0, minWidth: 44, justifyContent: "center" }} aria-label="Искать">⌕</button>
            </form>

            <a href="/" style={{ ...linkStyle, borderTop: "1px solid var(--line)", marginTop: 8 }} onClick={() => setOpen(false)}>
              Главная
            </a>

            {SECTIONS.map((s) => (
              <div key={s.title}>
                <div style={headStyle}>{s.title}</div>
                {s.links.map((l) => (
                  <a key={l.href} href={l.href} style={linkStyle} onClick={() => setOpen(false)}>
                    {l.label}
                  </a>
                ))}
              </div>
            ))}

            <div style={headStyle}>Ещё</div>
            <a href="/pro" style={linkStyle} onClick={() => setOpen(false)}>Pro-тарифы</a>

            <div style={{ marginTop: 24 }}>
              {authed ? (
                <>
                  <a href="/messages" style={{ ...linkStyle, display: "flex", alignItems: "center", gap: 10 }} onClick={() => setOpen(false)}>
                    💬 Сообщения
                    {unreadMsg > 0 && <MobBadge n={unreadMsg} />}
                  </a>
                  <a href="/notifications" style={{ ...linkStyle, display: "flex", alignItems: "center", gap: 10 }} onClick={() => setOpen(false)}>
                    🔔 Уведомления
                    {unreadNotif > 0 && <MobBadge n={unreadNotif} />}
                  </a>
                  {isStaff && (
                    <a href="/admin-panel" style={{ ...linkStyle, display: "flex", alignItems: "center", gap: 10, color: "var(--accent-2)" }} onClick={() => setOpen(false)}>
                      ⚙ Админка
                    </a>
                  )}
                  <a href="/cabinet" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", margin: "16px 0 10px" }} onClick={() => setOpen(false)}>
                    Кабинет
                  </a>
                  <button onClick={logout} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                    Выйти
                  </button>
                </>
              ) : (
                <a href="/auth/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setOpen(false)}>
                  Войти
                </a>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function MobBadge({ n }: { n: number }) {
  return (
    <span style={{
      minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9,
      background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700,
      lineHeight: "18px", textAlign: "center", fontFamily: "var(--font-mono),monospace",
    }}>
      {n > 9 ? "9+" : n}
    </span>
  );
}
