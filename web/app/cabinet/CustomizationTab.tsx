// Вкладка «Оформление» (Pro-кастомизация) кабинета. Вынесена из page.tsx (god-компонент).
// Единственное место рендера — раньше дублировалась ещё и во вкладке «Настройки»,
// хотя пункт меню и так виден только при активном user.is_pro (NAV_ITEMS в page.tsx).
import { DONATION_KINDS, DONATION_KIND_META, type MascotOption } from "../../lib/api";

type Look = { id: number; title: string };

type Props = {
  isPro: boolean;
  custSlug: string; setCustSlug: (v: string) => void;
  custAccent: string; setCustAccent: (v: string) => void;
  custHide: boolean; setCustHide: (fn: (v: boolean) => boolean) => void;
  custMascot: string; setCustMascot: (v: string) => void;
  mascotLib: MascotOption[];
  myLooks: Look[];
  pinnedIds: number[]; togglePin: (id: number) => void;
  donMethods: { kind: string; address: string }[]; setDonMethods: (fn: (p: { kind: string; address: string }[]) => { kind: string; address: string }[]) => void;
  donDraft: { kind: string; address: string }; setDonDraft: (v: { kind: string; address: string }) => void;
  custMsg: string;
  saveCustomization: () => void;
};

export default function CustomizationTab({
  isPro, custSlug, setCustSlug, custAccent, setCustAccent, custHide, setCustHide,
  custMascot, setCustMascot, mascotLib, myLooks, pinnedIds, togglePin,
  donMethods, setDonMethods, donDraft, setDonDraft, custMsg, saveCustomization,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 2 }}>Оформление профиля — адрес, цвет, маскот-компаньон, закреплённые образы, донаты.</div>
      <div className="acc-card">
        <h2 style={{ fontFamily: "var(--font-display),sans-serif", margin: "0 0 4px" }}>Pro-кастомизация</h2>
        {!isPro ? (
          <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
            Свой адрес профиля, акцентный цвет, маскот-компаньон, закреплённые образы и скрытие из каталога — фишки{" "}
            <a href="/pro" style={{ color: "var(--accent-2)" }}>Pro</a>.
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 14px" }}>Персонализируйте профиль — это видят гости.</p>
            <div className="field"><label>Свой адрес профиля</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>/u/</span>
                <input value={custSlug} onChange={(e) => setCustSlug(e.target.value)} placeholder="nick" style={{ flex: 1 }} />
              </div>
            </div>
            <div className="field"><label>Акцентный цвет</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={custAccent} onChange={(e) => setCustAccent(e.target.value)} style={{ width: 48, height: 34, padding: 2, background: "none", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{custAccent}</span>
              </div>
            </div>
            <div className="toggle-row" style={{ padding: "8px 0" }}>
              <div><strong style={{ fontSize: 13 }}>Скрыть из каталога</strong><div style={{ fontSize: 12, color: "var(--ink-dim)" }}>Профиль не показывается в списках, но доступен по прямой ссылке</div></div>
              <div className={`toggle${custHide ? " on" : ""}`} style={{ cursor: "pointer" }} onClick={() => setCustHide((v) => !v)} />
            </div>
            {myLooks.length > 0 && (
              <div className="field"><label>Закреплённые образы (до 3)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {myLooks.map((l) => {
                    const on = pinnedIds.includes(l.id);
                    return (
                      <button key={l.id} type="button" onClick={() => togglePin(l.id)}
                        style={{ fontSize: 12, padding: "5px 11px", borderRadius: 16, cursor: "pointer",
                          border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                          background: on ? "rgba(255,45,111,.12)" : "transparent", color: on ? "var(--accent)" : "var(--ink-dim)" }}>
                        {on ? "📌 " : ""}{l.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="field"><label>Приём донатов (крипта · без комиссии платформы)</label>
              {donMethods.map((dm, i) => {
                const meta = DONATION_KIND_META[dm.kind] || { label: dm.kind, network: "" };
                return (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--accent-2)", whiteSpace: "nowrap" }}>{meta.label} · {meta.network}</span>
                    <code style={{ flex: 1, fontSize: 11, wordBreak: "break-all", background: "var(--bg-3)", padding: "4px 8px", borderRadius: 6 }}>{dm.address}</code>
                    <button onClick={() => setDonMethods((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 6 }}>
                <select value={donDraft.kind} onChange={(e) => setDonDraft({ ...donDraft, kind: e.target.value })} style={{ maxWidth: 120 }}>
                  {DONATION_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
                <input value={donDraft.address} onChange={(e) => setDonDraft({ ...donDraft, address: e.target.value })} placeholder="адрес кошелька" style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-sm" onClick={() => { if (donDraft.address.trim()) { setDonMethods((p) => [...p, { kind: donDraft.kind, address: donDraft.address.trim() }]); setDonDraft({ ...donDraft, address: "" }); } }}>+ Добавить</button>
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-dim)", margin: "6px 0 0" }}>Перевод идёт напрямую вам. Указывайте правильную сеть (напр. USDT — только TRC-20).</p>
            </div>
            <div className="field"><label>Маскот-компаньон (Pro)</label>
              <p style={{ fontSize: 11, color: "var(--ink-dim)", margin: "0 0 8px" }}>Появляется уголком на аватаре твоего профиля.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[{ slug: "", name: "Без маскота", image: "" }, ...mascotLib].map((m) => {
                  const on = custMascot === m.slug;
                  return (
                    <button key={m.slug || "none"} type="button" onClick={() => setCustMascot(m.slug)}
                      title={m.name}
                      style={{ width: 48, height: 48, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        border: `2px solid ${on ? "var(--accent)" : "var(--line)"}`, background: on ? "rgba(255,45,111,.1)" : "var(--bg-3)" }}>
                      {m.slug
                        ? <img src={m.image} alt={m.name} style={{ width: 34, height: 34, objectFit: "contain" }} />
                        : <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>нет</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveCustomization}>Сохранить</button>
              {custMsg && <span style={{ fontSize: 12, color: custMsg.includes("✓") ? "var(--green)" : "var(--red)" }}>{custMsg}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
