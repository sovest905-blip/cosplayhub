export default function LoginPage() {
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

        <form action="/api/v1/auth/login/" method="POST">
          <div className="field">
            <label>Email</label>
            <input type="email" name="email" placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input type="password" name="password" placeholder="••••••••" required />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-big"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            Войти →
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
