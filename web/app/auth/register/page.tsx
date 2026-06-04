"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "/api/v1";

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

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [taken, setTaken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setTaken(false); setLoading(true);
    const form = new FormData(e.currentTarget);
    const identifier = (form.get("identifier") as string).trim();

    if (!identifier.includes("@")) {
      setError("Введите корректный email");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier,
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data.identifier?.[0] ||
          data.username?.[0] ||
          data.password?.[0] ||
          data.detail ||
          "Ошибка регистрации";
        if (msg.includes("занят") || msg.includes("зарегистрирован")) setTaken(true);
        throw new Error(msg);
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap" style={{ display: "flex", justifyContent: "center", padding: "60px 28px" }}>
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--line)",
        borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 480,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="logo-mark" />
            <span style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 900, fontSize: 17 }}>КОСПЛЕЙ.ХАБ</span>
          </a>
          <div className="eyebrow" style={{ justifyContent: "center" }}>закрытая бета · по инвайту</div>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
            Регистрация
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
            Первые 200 участников — Pro бесплатно на 3 месяца
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Ник (публичное имя)</label>
            <input type="text" name="username" placeholder="YourNick" required autoComplete="username" />
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" name="identifier" placeholder="you@example.com" required autoComplete="email" />
          </div>

          <div className="field">
            <label>Пароль</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                name="password"
                placeholder="Минимум 10 символов"
                required minLength={10}
                autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--ink-dim)", padding: 0, display: "flex",
                }}
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 13, marginBottom: 12, padding: "10px 14px", background: "rgba(255,45,111,.1)", borderRadius: 8, border: "1px solid rgba(255,45,111,.2)" }}>
              <span style={{ color: "var(--accent)" }}>{error}</span>
              {taken && (
                <div style={{ marginTop: 8 }}>
                  <a href="/auth/forgot-password" style={{ color: "var(--accent-2)", fontSize: 12 }}>
                    → Восстановить пароль
                  </a>
                  <span style={{ color: "var(--ink-dim)", fontSize: 12 }}> или </span>
                  <a href="/auth/login" style={{ color: "var(--accent-2)", fontSize: 12 }}>
                    Войти
                  </a>
                </div>
              )}
            </div>
          )}

          <div style={{
            background: "rgba(124,249,255,.06)", border: "1px solid rgba(124,249,255,.2)",
            borderRadius: 10, padding: "10px 14px", fontSize: 11,
            color: "var(--ink-dim)", marginBottom: 16, lineHeight: 1.6,
          }}>
            После регистрации придёт код на почту — подтверди email и войдёшь.
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Создаём аккаунт..." : "Создать аккаунт →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--ink-dim)" }}>
          Уже есть аккаунт?{" "}
          <a href="/auth/login" style={{ color: "var(--accent-2)" }}>Войти</a>
        </p>
      </div>
    </div>
  );
}
