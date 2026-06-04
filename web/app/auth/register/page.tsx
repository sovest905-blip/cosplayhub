"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function detectKind(val: string): "email" | "phone" | null {
    if (val.includes("@")) return "email";
    const digits = val.replace(/\D/g, "");
    if (digits.length >= 10) return "phone";
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setLoading(true);
    const form = new FormData(e.currentTarget);
    const identifier = (form.get("identifier") as string).trim();
    const kind = detectKind(identifier);

    if (!kind) {
      setError("Введите корректный email или номер телефона");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register/`, {
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
        const err = data.identifier?.[0] || data.username?.[0] || data.password?.[0] || data.detail || "Ошибка регистрации";
        throw new Error(err);
      }

      if (kind === "email") {
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      } else if (data.tg_link) {
        router.push(`/auth/verify-phone?token=${data.tg_token}&phone=${encodeURIComponent(data.phone)}`);
      } else {
        // auto_login (Telegram не настроен, тест-режим)
        router.push("/cabinet");
      }
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
            <label>Ник (публичное имя)</label>
            <input type="text" name="username" placeholder="YourNick" required autoComplete="username" />
          </div>

          <div className="field">
            <label>Email или номер телефона</label>
            <input type="text" name="identifier" placeholder="+7 900 000 00 00 или you@example.com" required autoComplete="email" />
          </div>

          <div className="field">
            <label>Пароль</label>
            <input type="password" name="password" placeholder="Минимум 10 символов" required minLength={10} autoComplete="new-password" />
          </div>

          {error && (
            <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div style={{
            background: "rgba(124,249,255,.06)", border: "1px solid rgba(124,249,255,.2)",
            borderRadius: 10, padding: "12px 14px", fontSize: 11,
            color: "var(--ink-dim)", marginBottom: 16, lineHeight: 1.6,
          }}>
            При регистрации по email — подтвердишь почту кодом.<br />
            По номеру телефона — код придёт в Telegram.
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
