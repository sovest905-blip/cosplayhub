"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: form.get("email"),
            password: form.get("password"),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.non_field_errors?.[0] || "Неверный email или пароль");
      }
      router.push("/cabinet");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap" style={{ display: "flex", justifyContent: "center", padding: "60px 28px" }}>
      <div style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "32px 36px",
        width: "100%",
        maxWidth: 440,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="logo-mark" />
            <span style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 17 }}>КОСПЛЕЙ.ХАБ</span>
          </a>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
            Войти
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>Бета-доступ по инвайту</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" name="email" placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input type="password" name="password" placeholder="••••••••" required />
          </div>

          {error && (
            <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", marginTop: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Входим..." : "Войти →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--ink-dim)" }}>
          Нет аккаунта?{" "}
          <a href="/auth/register" style={{ color: "var(--accent-2)" }}>Запросить инвайт</a>
        </p>
      </div>
    </div>
  );
}
