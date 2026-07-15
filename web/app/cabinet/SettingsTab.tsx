// Вкладка «Настройки» кабинета (аккаунт/приватность/пароль/удаление). Вынесена из page.tsx
// (god-компонент). Pro-кастомизация здесь больше НЕ дублируется — она живёт только во
// вкладке «Оформление» (CustomizationTab), которая видна в сайдбаре только при активном Pro.
type Me = { email?: string; phone?: string };

type Props = {
  me: Me;
  emStep: 0 | 1 | 2; setEmStep: (v: 0 | 1 | 2) => void;
  emNew: string; setEmNew: (v: string) => void;
  emCode: string; setEmCode: (v: string) => void;
  emBusy: boolean;
  emMsg: { ok: boolean; text: string } | null; setEmMsg: (v: { ok: boolean; text: string } | null) => void;
  requestEmailChange: () => void; confirmEmailChange: () => void;

  availForWork: boolean; setAvailForWork: (v: boolean) => void;
  acceptMessages: boolean; setAcceptMessages: (v: boolean) => void;
  patchProfile: (patch: Record<string, unknown>) => void;

  pwForm: { current: string; next: string; repeat: string }; setPwForm: (v: any) => void;
  pwSaving: boolean;
  pwMsg: { ok: boolean; text: string } | null;
  changePassword: () => void;

  delConfirm: boolean; setDelConfirm: (v: boolean) => void;
  delPw: string; setDelPw: (v: string) => void;
  delBusy: boolean; delErr: string; setDelErr: (v: string) => void;
  deleteAccount: () => void;
};

export default function SettingsTab({
  me, emStep, setEmStep, emNew, setEmNew, emCode, setEmCode, emBusy, emMsg, setEmMsg,
  requestEmailChange, confirmEmailChange, availForWork, setAvailForWork, acceptMessages, setAcceptMessages,
  patchProfile, pwForm, setPwForm, pwSaving, pwMsg, changePassword,
  delConfirm, setDelConfirm, delPw, setDelPw, delBusy, delErr, setDelErr, deleteAccount,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Учётные данные */}
      <div className="acc-card">
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 14px" }}>Аккаунт</h2>
        <div className="info-row">
          <span>Email</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--ink-dim)" }}>{me.email || "—"}</span>
            {me.email && emStep === 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setEmStep(1); setEmMsg(null); }}>Изменить</button>
            )}
          </span>
        </div>
        {me.phone && <div className="info-row"><span>Телефон</span><span style={{ color: "var(--ink-dim)" }}>{me.phone}</span></div>}

        {emStep === 1 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div className="field"><label>Новый email</label>
              <input type="email" value={emNew} onChange={(e) => setEmNew(e.target.value)} placeholder="new@example.com" style={{ maxWidth: 320 }} /></div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>На новый адрес придёт код подтверждения.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={requestEmailChange} disabled={emBusy || !emNew}>{emBusy ? "Отправляем…" : "Отправить код"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEmStep(0); setEmNew(""); setEmMsg(null); }}>Отмена</button>
              {emMsg && <span style={{ fontSize: 12, color: emMsg.ok ? "var(--green)" : "var(--red)" }}>{emMsg.text}</span>}
            </div>
          </div>
        )}

        {emStep === 2 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div className="field"><label>Код из письма на {emNew}</label>
              <input inputMode="numeric" value={emCode} onChange={(e) => setEmCode(e.target.value)} placeholder="6 цифр" style={{ maxWidth: 160, letterSpacing: 4, fontFamily: "var(--font-mono),monospace" }} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={confirmEmailChange} disabled={emBusy || emCode.length < 4}>{emBusy ? "Проверяем…" : "Подтвердить"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEmStep(0); setEmNew(""); setEmCode(""); setEmMsg(null); }}>Отмена</button>
              {emMsg && <span style={{ fontSize: 12, color: emMsg.ok ? "var(--green)" : "var(--red)" }}>{emMsg.text}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Приватность */}
      <div className="acc-card">
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 4px" }}>Приватность</h2>
        <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>Те же тумблеры есть во вкладке «Роли и услуги».</p>
        <div className="toggle-row" style={{ padding: "8px 0" }}>
          <div><strong style={{ fontSize: 13 }}>Открыт для работы</strong><div style={{ fontSize: 12, color: "var(--ink-dim)" }}>Показывать бейдж «Доступен» в профиле</div></div>
          <div className={`toggle${availForWork ? " on" : ""}`} style={{ cursor: "pointer" }}
            onClick={() => { const v = !availForWork; setAvailForWork(v); patchProfile({ available_for_work: v }); }} />
        </div>
        <div className="toggle-row" style={{ padding: "8px 0" }}>
          <div><strong style={{ fontSize: 13 }}>Принимать сообщения</strong><div style={{ fontSize: 12, color: "var(--ink-dim)" }}>Разрешить писать тебе в мессенджер</div></div>
          <div className={`toggle${acceptMessages ? " on" : ""}`} style={{ cursor: "pointer" }}
            onClick={() => { const v = !acceptMessages; setAcceptMessages(v); patchProfile({ accept_messages: v }); }} />
        </div>
      </div>

      {/* Смена пароля */}
      <div className="acc-card">
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 14px" }}>Смена пароля</h2>
        <div className="field"><label>Текущий пароль</label>
          <input type="password" autoComplete="current-password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} /></div>
        <div className="field"><label>Новый пароль (мин. 10 символов)</label>
          <input type="password" autoComplete="new-password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} /></div>
        <div className="field"><label>Повтор нового пароля</label>
          <input type="password" autoComplete="new-password" value={pwForm.repeat} onChange={(e) => setPwForm({ ...pwForm, repeat: e.target.value })} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={pwSaving || !pwForm.current || !pwForm.next}>
            {pwSaving ? "Сохраняем…" : "Сменить пароль"}
          </button>
          {pwMsg && <span style={{ fontSize: 12, color: pwMsg.ok ? "var(--green)" : "var(--red)" }}>{pwMsg.text}</span>}
        </div>
      </div>

      {/* Опасная зона */}
      <div className="acc-card" style={{ border: "1px solid rgba(255,45,111,.3)" }}>
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 4px", color: "var(--accent)" }}>Удаление аккаунта</h2>
        <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>
          Аккаунт, профиль, объявления, заказы и слоты будут удалены навсегда. Отменить нельзя.
        </p>
        {!delConfirm ? (
          <button className="btn btn-sm" style={{ background: "rgba(255,45,111,.12)", border: "1px solid rgba(255,45,111,.3)", color: "var(--accent)" }}
            onClick={() => setDelConfirm(true)}>Удалить аккаунт…</button>
        ) : (
          <div>
            <div className="field"><label>Подтверди паролем</label>
              <input type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} style={{ maxWidth: 280 }} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="btn btn-sm" style={{ background: "var(--accent)", border: "none", color: "#fff" }}
                onClick={deleteAccount} disabled={delBusy || !delPw}>
                {delBusy ? "Удаляем…" : "Удалить навсегда"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setDelConfirm(false); setDelPw(""); setDelErr(""); }}>Отмена</button>
              {delErr && <span style={{ fontSize: 12, color: "var(--red)" }}>{delErr}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
