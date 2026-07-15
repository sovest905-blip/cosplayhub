// Вкладка «Мои гайды» кабинета. Вынесена из page.tsx (god-компонент).
import EmptyBlock from "./EmptyBlock";

const G_RU: Record<string, string> = { pending: "На модерации", published: "Опубликован", rejected: "Отклонён" };
const G_COLOR: Record<string, string> = { pending: "var(--accent-3)", published: "var(--green)", rejected: "var(--red)" };

type Props = {
  myGuides: any[] | null; setMyGuides: (fn: (prev: any[] | null) => any[]) => void;
};

export default function GuidesTab({ myGuides, setMyGuides }: Props) {
  const guides = myGuides || [];
  const delGuide = async (id: number) => {
    if (!confirm("Удалить гайд?")) return;
    await fetch(`/api/v1/guides/${id}/`, { method: "DELETE", credentials: "include" });
    setMyGuides((p) => (p || []).filter((g: any) => g.id !== id));
  };
  return (
    <div className="acc-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Мои гайды</h2>
        <a href="/guides/new" className="btn btn-primary btn-sm">+ Написать гайд</a>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
        Ваши туториалы по крафту. После отправки гайд проходит модерацию — здесь виден его статус. Опубликованные видны всем на <a href="/guides">/guides</a>.
      </p>
      {guides.length === 0 ? (
        <EmptyBlock icon="✎" title="Гайдов пока нет"
          sub="Поделитесь опытом крафта — EVA, термоформовка, покраска, парики, грим. Нажмите «Написать гайд»." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {guides.map((g: any) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 8, flexShrink: 0, border: "1px solid var(--line)",
                background: g.cover ? `center/cover url('${g.cover}')` : "var(--bg-3)",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>
                  {g.status === "published"
                    ? <a href={`/guides/${g.id}`} style={{ color: "inherit" }}>{g.title}</a>
                    : g.title}
                </b>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                  {g.category ? `${g.category} · ` : ""}{g.created_at ? new Date(g.created_at).toLocaleDateString("ru-RU") : ""}
                </div>
                {g.status === "rejected" && g.moderation_note && (
                  <div style={{ fontSize: 12, color: "var(--red)", marginTop: 2 }}>Причина: {g.moderation_note}</div>
                )}
              </div>
              <span style={{ fontSize: 11, whiteSpace: "nowrap", padding: "2px 9px", borderRadius: 20,
                color: G_COLOR[g.status] || "var(--ink)", border: `1px solid ${G_COLOR[g.status] || "var(--line)"}55` }}>
                {G_RU[g.status] || g.status}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => delGuide(g.id)}>Удалить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
