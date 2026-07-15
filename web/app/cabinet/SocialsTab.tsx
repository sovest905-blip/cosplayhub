// Вкладка «Соцсети» кабинета. Вынесена из page.tsx (god-компонент).
import { SOCIAL_META } from "../../lib/api";

type Props = {
  socials: Record<string, string>; setSocials: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  saveSocials: () => void; socialsSaving: boolean; socialsSaved: boolean;
};

export default function SocialsTab({ socials, setSocials, saveSocials, socialsSaving, socialsSaved }: Props) {
  return (
    <div className="acc-card">
      <h2 style={{ margin: "0 0 4px" }}>Соцсети</h2>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
        Добавь ссылки или ники — покажем их на твоём профиле. Можно вставить полную ссылку или просто ник.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0 16px" }}>
        {Object.entries(SOCIAL_META).map(([slug, meta]) => (
          <div className="field" key={slug}>
            <label>
              <span style={{ color: "var(--accent-2)", marginRight: 6 }}>{meta.icon}</span>
              {meta.label}
            </label>
            <input
              value={socials[slug] || ""}
              placeholder={meta.base ? `${meta.base}ник или ник` : "ник / ссылка"}
              onChange={(e) => setSocials((prev) => ({ ...prev, [slug]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
        <button className="btn btn-primary" onClick={saveSocials} disabled={socialsSaving}>
          {socialsSaving ? "Сохраняем..." : "Сохранить"}
        </button>
        <span style={{ fontSize: 12, color: "var(--green)", opacity: socialsSaved ? 1 : 0, transition: "opacity .3s" }}>
          ✓ Сохранено
        </span>
      </div>
    </div>
  );
}
