"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/cabinet");
      router.refresh();
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
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>Войдите в свой аккаунт</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" name="identifier" placeholder="you@example.com" required autoComplete="username" />
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

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--ink-dim)" }}>
          Нет аккаунта?{" "}
          <a href="/auth/register" style={{ color: "var(--accent-2)" }}>Зарегистрироваться</a>
        </p>
      </div>
    </div>
  );
}
