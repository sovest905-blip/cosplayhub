"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyPhoneInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const phone = params.get("phone") || "";
  const tgLink = `https://t.me/${process.env.NEXT_PUBLIC_TG_BOT_USERNAME}?start=${token}`;

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-telegram-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Неверный код");
      router.push("/cabinet");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally { setLoading(false); }
  }

  return (
    <div className="wrap" style={{ display: "flex", justifyContent: "center", padding: "60px 28px" }}>
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--line)",
        borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 440, textAlign: "center",
      }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div className="logo-mark" />
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 17 }}>КОСПЛЕЙ.ХАБ</span>
        </a>

        <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
        <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
          Подтверди телефон
        </h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "0 0 24px" }}>
          Номер: <strong style={{ color: "var(--ink)" }}>{phone}</strong>
        </p>

        <a href={tgLink} target="_blank" rel="noopener noreferrer" className="btn btn-big"
          style={{
            display: "flex", width: "100%", justifyContent: "center",
            background: "#2AABEE", color: "#fff", marginBottom: 20, gap: 8,
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.4 13.9l-2.97-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.537-.194 1.006.13.758.658z"/>
          </svg>
          Получить код в Telegram →
        </a>

        <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 16 }}>
          Нажми кнопку выше → откроется бот → нажми Start → получишь код
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <input type="text" inputMode="numeric" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              style={{ textAlign: "center", fontSize: 28, fontWeight: 700, letterSpacing: 10 }} />
          </div>
          {error && (
            <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading || code.length < 6} className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", opacity: (loading || code.length < 6) ? 0.6 : 1 }}>
            {loading ? "Проверяем..." : "Подтвердить →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPhonePage() {
  return <Suspense><VerifyPhoneInner /></Suspense>;
}
