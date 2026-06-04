"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(""));
      inputs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code: fullCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Неверный код");
      }
      router.push("/cabinet");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    try {
      await fetch(`/api/v1/auth/send-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } finally {
      setResending(false);
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
        textAlign: "center",
      }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div className="logo-mark" />
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: 17 }}>КОСПЛЕЙ.ХАБ</span>
        </a>

        <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
        <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
          Подтверди email
        </h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "0 0 28px" }}>
          Отправили 6-значный код на<br />
          <strong style={{ color: "var(--ink)" }}>{email}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                style={{
                  width: 48,
                  height: 56,
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--bg-3, var(--bg-2))",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.join("").length < 6}
            className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", opacity: (loading || code.join("").length < 6) ? 0.6 : 1 }}
          >
            {loading ? "Проверяем..." : "Подтвердить →"}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: "var(--ink-dim)" }}>
          Не пришло?{" "}
          <button
            onClick={handleResend}
            disabled={resending}
            style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: "pointer", fontSize: 12, padding: 0 }}
          >
            {resending ? "Отправляем..." : "Отправить ещё раз"}
          </button>
          {resent && <span style={{ color: "var(--accent-2)", marginLeft: 6 }}>✓ Отправлено</span>}
        </p>

        <p style={{ marginTop: 8, fontSize: 11, color: "var(--ink-dim)" }}>
          Проверь папку «Спам» — иногда попадает туда.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
