"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function TelegramLoginBlock() {
  const router = useRouter();
  const [tgId, setTgId] = useState("");
  const [tgStep, setTgStep] = useState<"id" | "code">("id");
  const [tgLink, setTgLink] = useState("");
  const [tgToken, setTgToken] = useState("");
  const [tgCode, setTgCode] = useState("");
  const [tgEmail, setTgEmail] = useState("");
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState("");

  async function requestTgCode() {
    setTgLoading(true); setTgError("");
    try {
      const res = await fetch(`/api/v1/auth/send-telegram-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: tgId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Ошибка");
      setTgLink(data.link); setTgToken(data.token); setTgEmail(data.email || "");
      setTgStep("code");
    } catch (err: unknown) {
      setTgError(err instanceof Error ? err.message : "Ошибка");
    } finally { setTgLoading(false); }
  }

  async function verifyTgCode() {
    setTgLoading(true); setTgError("");
    try {
      const res = await fetch(`/api/v1/auth/verify-telegram-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: tgToken, code: tgCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Неверный код");
      router.push("/cabinet");
    } catch (err: unknown) {
      setTgError(err instanceof Error ? err.message : "Ошибка");
    } finally { setTgLoading(false); }
  }

  return (
    <div style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>или войди через</p>
      {tgStep === "id" ? (
        <>
          <div className="field" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12 }}>Email или номер телефона</label>
            <input type="text" value={tgId} onChange={e => setTgId(e.target.value)} placeholder="+7 900 000 00 00 или you@example.com" />
          </div>
          {tgError && <div style={{ color: "var(--accent)", fontSize: 12, marginBottom: 8, padding: "6px 10px", background: "rgba(255,45,111,.1)", borderRadius: 6 }}>{tgError}</div>}
          <button onClick={requestTgCode} disabled={tgLoading || !tgId} className="btn btn-big"
            style={{ width: "100%", justifyContent: "center", background: "#2AABEE", color: "#fff", gap: 8, opacity: (tgLoading || !tgId) ? 0.6 : 1 }}>
            <TgIcon /> {tgLoading ? "..." : "Получить код в Telegram"}
          </button>
        </>
      ) : (
        <>
          <a href={tgLink} target="_blank" rel="noopener noreferrer" className="btn btn-big"
            style={{ width: "100%", justifyContent: "center", display: "flex", background: "#2AABEE", color: "#fff", marginBottom: 12, gap: 8 }}>
            <TgIcon /> Открыть бота и получить код →
          </a>
          <p style={{ fontSize: 11, color: "var(--ink-dim)", textAlign: "center", marginBottom: 12 }}>Введи код из Telegram:</p>
          <div className="field" style={{ marginBottom: 8 }}>
            <input type="text" inputMode="numeric" maxLength={6} value={tgCode}
              onChange={e => setTgCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              style={{ textAlign: "center", fontSize: 22, fontWeight: 700, letterSpacing: 8 }} />
          </div>
          {tgError && <div style={{ color: "var(--accent)", fontSize: 12, marginBottom: 8, padding: "6px 10px", background: "rgba(255,45,111,.1)", borderRadius: 6 }}>{tgError}</div>}
          <button onClick={verifyTgCode} disabled={tgLoading || tgCode.length < 6} className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", opacity: (tgLoading || tgCode.length < 6) ? 0.6 : 1 }}>
            {tgLoading ? "Проверяем..." : "Войти →"}
          </button>
          <button onClick={() => { setTgStep("id"); setTgError(""); setTgCode(""); }}
            style={{ background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: 11, marginTop: 8, width: "100%", padding: 0 }}>
            ← Назад
          </button>
        </>
      )}
    </div>
  );
}

function TgIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.4 13.9l-2.97-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.537-.194 1.006.13.758.658z"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/v1/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: form.get("identifier"), password: form.get("password") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Неверные данные");
      }
      router.push("/cabinet");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally { setLoading(false); }
  }

  return (
    <div className="wrap" style={{ display: "flex", justifyContent: "center", padding: "60px 28px" }}>
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="logo-mark" />
            <span style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 900, fontSize: 17 }}>КОСПЛЕЙ.ХАБ</span>
          </a>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Войти</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>Бета-доступ по инвайту</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email или номер телефона</label>
            <input type="text" name="identifier" placeholder="+7 900 000 00 00 или you@example.com" required autoComplete="username" />
          </div>
          <div className="field">
            <label>Пароль</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} name="password" placeholder="••••••••" required autoComplete="current-password" style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-dim)", padding: 0, display: "flex" }}>
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", marginTop: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Входим..." : "Войти →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 14, fontSize: 12 }}>
          <a href="/auth/forgot-password" style={{ color: "var(--ink-dim)" }}>Забыл пароль?</a>
        </p>

        <TelegramLoginBlock />

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--ink-dim)" }}>
          Нет аккаунта?{" "}
          <a href="/auth/register" style={{ color: "var(--accent-2)" }}>Зарегистрироваться</a>
        </p>
      </div>
    </div>
  );
}
