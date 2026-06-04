"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "identifier" | "code" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState(""); // resolved email from backend
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Шаг 1: отправить OTP ──────────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Ошибка");
      setEmail(data.email || identifier);
      setStep("code");
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally { setLoading(false); }
  }

  // ── Шаг 2: ввод кода ─────────────────────────────────────────────────────
  function handleCodeChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code]; next[i] = digit; setCode(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  }
  function handleCodeKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  }
  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) { setCode(text.split("")); inputs.current[5]?.focus(); }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) return;
    // Просто переходим к шагу пароля (сервер проверит код при сбросе)
    setStep("password");
  }

  // ── Шаг 3: новый пароль ──────────────────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("Пароли не совпадают"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code: code.join(""), new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Ошибка");
      router.push("/cabinet");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
      if ((err as Error).message?.includes("код")) {
        setStep("code");
        setCode(["", "", "", "", "", ""]);
      }
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

          {/* Прогресс */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            {(["identifier", "code", "password"] as Step[]).map((s, i) => (
              <div key={s} style={{
                width: step === s ? 24 : 8, height: 8, borderRadius: 4,
                background: step === s ? "var(--accent-2)" :
                  (["identifier", "code", "password"].indexOf(step) > i ? "var(--accent-2)" : "var(--line)"),
                transition: "all .3s",
              }} />
            ))}
          </div>

          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
            {step === "identifier" && "Восстановление пароля"}
            {step === "code" && "Введи код"}
            {step === "password" && "Новый пароль"}
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
            {step === "identifier" && "Введи email или телефон от аккаунта"}
            {step === "code" && <>Код отправлен на <strong style={{ color: "var(--ink)" }}>{email}</strong></>}
            {step === "password" && "Придумай новый пароль"}
          </p>
        </div>

        {error && (
          <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 16, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
            {error}
          </div>
        )}

        {/* Шаг 1 */}
        {step === "identifier" && (
          <form onSubmit={handleSendOtp}>
            <div className="field">
              <label>Email или номер телефона</label>
              <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                placeholder="+7 900 000 00 00 или you@example.com" required autoFocus />
            </div>
            <button type="submit" disabled={loading || !identifier} className="btn btn-primary btn-big"
              style={{ width: "100%", justifyContent: "center", opacity: (loading || !identifier) ? 0.6 : 1 }}>
              {loading ? "Отправляем..." : "Отправить код →"}
            </button>
          </form>
        )}

        {/* Шаг 2 */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              {code.map((digit, i) => (
                <input key={i} ref={el => { inputs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => handleCodeKey(i, e)}
                  onPaste={handlePaste}
                  style={{ width: 48, height: 56, textAlign: "center", fontSize: 24, fontWeight: 700,
                    borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg-3, var(--bg-2))", color: "var(--ink)", outline: "none" }} />
              ))}
            </div>
            <button type="submit" disabled={code.join("").length < 6} className="btn btn-primary btn-big"
              style={{ width: "100%", justifyContent: "center", opacity: code.join("").length < 6 ? 0.6 : 1 }}>
              Продолжить →
            </button>
            <button type="button" onClick={handleSendOtp} disabled={loading}
              style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: "pointer", fontSize: 12, marginTop: 12, width: "100%", padding: 0 }}>
              {loading ? "Отправляем..." : "Отправить ещё раз"}
            </button>
          </form>
        )}

        {/* Шаг 3 */}
        {step === "password" && (
          <form onSubmit={handleResetPassword}>
            <div className="field">
              <label>Новый пароль</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Минимум 10 символов" required minLength={10} autoFocus autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Повторить пароль</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••••" required autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading || newPassword.length < 10} className="btn btn-primary btn-big"
              style={{ width: "100%", justifyContent: "center", opacity: (loading || newPassword.length < 10) ? 0.6 : 1 }}>
              {loading ? "Сохраняем..." : "Сохранить и войти →"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--ink-dim)" }}>
          Вспомнил пароль?{" "}
          <a href="/auth/login" style={{ color: "var(--accent-2)" }}>Войти</a>
        </p>
      </div>
    </div>
  );
}
