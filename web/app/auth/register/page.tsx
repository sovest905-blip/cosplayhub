"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
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
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: form.get("email"),
            password: form.get("password"),
            username: form.get("display_name"),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.detail || data.email?.[0] || data.password?.[0] || data.username?.[0] || Object.values(data)[0]?.[0] || "Ошибка регистрации";
        throw new Error(msg);
      }
      router.push("/cabinet");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
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
        maxWidth: 480,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="logo-mark" />
            <span style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 17 }}>КОСПЛЕЙ.ХАБ</span>
          </a>
          <div className="eyebrow" style={{ justifyContent: "center" }}>закрытая бета · по инвайту</div>
          <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
            Регистрация
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
            Первые 200 участников — Pro бесплатно на 3 месяца
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Ник (отображается публично)</label>
            <input type="text" name="display_name" placeholder="YourNick" required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" name="email" placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input type="password" name="password" placeholder="Минимум 10 символов" required minLength={10} />
          </div>

          {error && (
            <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div style={{
            background: "rgba(124,249,255,.06)",
            border: "1px solid rgba(124,249,255,.2)",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 11,
            color: "var(--ink-dim)",
            marginBottom: 16,
            lineHeight: 1.6,
          }}>
            Регистрируясь, ты соглашаешься передавать только публичные данные (ник, город, фото).
            Никаких реальных платежей в бете нет.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}
          >
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
