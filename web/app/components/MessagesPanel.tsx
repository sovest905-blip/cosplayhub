"use client";
import { useEffect, useRef, useState } from "react";

export type Conversation = {
  id: number;
  other: { user_id: number; username: string; avatar: string | null } | null;
  last_message: { text: string; created_at: string; sender_id: number } | null;
  unread: number;
  updated_at: string;
};

type Message = {
  id: number;
  text: string;
  sender_username: string;
  is_mine: boolean;
  created_at: string;
};

function timeShort(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

// Переиспользуемый мессенджер. Используется на странице /messages и во вкладке
// «Сообщения» личного кабинета — диалоги одни и те же (бэкенд /conversations/).
// toUser — начать/открыть диалог с этим пользователем (из барахолки, профиля и т.п.).
export default function MessagesPanel({
  toUser = null,
  onToConsumed,
  onUnreadChange,
}: {
  toUser?: string | null;
  onToConsumed?: () => void;
  onUnreadChange?: (total: number) => void;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // Проверка авторизации
  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  // Загрузка списка диалогов
  async function loadConvs(): Promise<Conversation[]> {
    const r = await fetch("/api/v1/conversations/", { credentials: "include" });
    if (!r.ok) return [];
    const data = await r.json();
    const list = Array.isArray(data) ? data : [];
    setConvs(list);
    onUnreadChange?.(list.reduce((s: number, c: Conversation) => s + (c.unread || 0), 0));
    return list;
  }

  // Старт диалога с toUser
  useEffect(() => {
    if (authed !== true) return;
    (async () => {
      if (toUser) {
        const r = await fetch("/api/v1/conversations/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ user: Number(toUser) }),
        });
        if (r.ok) {
          const conv = await r.json();
          await loadConvs();
          setActiveId(conv.id);
          onToConsumed?.();
          return;
        }
      }
      const list = await loadConvs();
      if (list.length > 0 && activeId === null) setActiveId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, toUser]);

  // Загрузка сообщений активного диалога + поллинг
  useEffect(() => {
    if (activeId === null) return;
    let cancelled = false;
    async function load() {
      const r = await fetch(`/api/v1/conversations/${activeId}/messages/`, { credentials: "include" });
      if (!r.ok || cancelled) return;
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : []);
    }
    load();
    const id = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeId]);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || activeId === null) return;
    setSending(true);
    try {
      const r = await fetch(`/api/v1/conversations/${activeId}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages((prev) => [...prev, msg]);
        setDraft("");
        loadConvs();
      }
    } finally {
      setSending(false);
    }
  }

  if (authed === false) {
    return (
      <div style={{ paddingTop: 60, textAlign: "center" }}>
        <p style={{ color: "var(--ink-dim)", marginBottom: 16 }}>Войдите, чтобы переписываться.</p>
        <a href="/auth/login?next=/messages" className="btn btn-primary">Войти</a>
      </div>
    );
  }
  if (authed === null) {
    return <div style={{ paddingTop: 60, textAlign: "center", color: "var(--ink-dim)" }}>Загрузка...</div>;
  }

  const active = convs.find((c) => c.id === activeId) || null;

  return (
    <div className="msg-layout">
      {/* Список диалогов */}
      <div className="msg-list">
        <div className="msg-list-head">Диалоги</div>
        {convs.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
            Пока нет диалогов. Напишите кому-нибудь со страницы профиля или из барахолки.
          </div>
        )}
        {convs.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`msg-conv${c.id === activeId ? " on" : ""}`}
          >
            <div className="msg-conv-av" style={{
              background: c.other?.avatar ? `url('${c.other.avatar}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
            }}>
              {!c.other?.avatar && (c.other?.username || "?").charAt(0).toUpperCase()}
            </div>
            <div className="msg-conv-body">
              <div className="msg-conv-name">
                {c.other?.username || "Пользователь"}
                {c.unread > 0 && <span className="msg-unread-dot">{c.unread}</span>}
              </div>
              <div className="msg-conv-last">{c.last_message?.text || "Нет сообщений"}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Тред */}
      <div className="msg-thread-wrap">
        {active ? (
          <>
            <div className="msg-thread-head">
              <a href={active.other ? `/people/${active.other.user_id}` : "#"} style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                <div className="msg-conv-av sm" style={{
                  background: active.other?.avatar ? `url('${active.other.avatar}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
                }}>
                  {!active.other?.avatar && (active.other?.username || "?").charAt(0).toUpperCase()}
                </div>
                <b>{active.other?.username || "Пользователь"}</b>
              </a>
            </div>

            <div className="msg-thread" ref={threadRef}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 13, marginTop: 30 }}>
                  Начните диалог — напишите первое сообщение.
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`msg-bubble-row${m.is_mine ? " mine" : ""}`}>
                    <div className="msg-bubble">
                      {m.text}
                      <span className="msg-time">{timeShort(m.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="msg-compose" onSubmit={send}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Сообщение..."
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
                {sending ? "..." : "→"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-dim)", fontSize: 14 }}>
            Выберите диалог
          </div>
        )}
      </div>
    </div>
  );
}
