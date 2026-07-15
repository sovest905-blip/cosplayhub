// Вкладка «Профиль» кабинета (обложка/аватар/базовые данные). Вынесена из page.tsx (god-компонент).
import CitySelect from "./CitySelect";

type Form = { username: string; city: string; experience: string; bio: string };

type Props = {
  coverUrl: string | null;
  avatarUrl: string | null;
  userPhoto: string | null;
  photoUploading: "avatar" | "cover" | null;
  uploadPhoto: (kind: "avatar" | "cover", file: File) => void;
  deletePhoto: (kind: "avatar" | "cover") => void;
  form: Form; setForm: (v: Form) => void;
  saveErr: string;
  saving: boolean; saved: boolean;
  saveBasics: () => void;
};

export default function ProfileTab({
  coverUrl, avatarUrl, userPhoto, photoUploading, uploadPhoto, deletePhoto,
  form, setForm, saveErr, saving, saved, saveBasics,
}: Props) {
  return (
    <div className="acc-card">
      {/* Обложка */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 8 }}>Обложка профиля</label>
        <div style={{
          height: 130, borderRadius: 12, marginBottom: 8,
          background: coverUrl ? `url('${coverUrl}') center/cover no-repeat` : "linear-gradient(135deg,rgba(255,45,111,.15),rgba(124,249,255,.08))",
          border: "1px solid var(--line)",
        }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" disabled={photoUploading === "cover"}
            onClick={() => (document.getElementById("cover-input") as HTMLInputElement)?.click()}
            style={{ flex: 1 }}>
            {photoUploading === "cover" ? "Загружаем..." : "⬆ Загрузить обложку"}
          </button>
          {coverUrl && (
            <button className="btn btn-sm" disabled={photoUploading === "cover"}
              onClick={() => deletePhoto("cover")}
              style={{ background: "rgba(255,45,111,.12)", border: "1px solid rgba(255,45,111,.25)", color: "var(--accent)" }}>
              ✕ Удалить
            </button>
          )}
        </div>
        <input id="cover-input" type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto("cover", f); e.target.value = ""; }} />
      </div>

      {/* Аватар */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 8 }}>Аватар</label>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            onClick={() => { if (photoUploading !== "avatar") (document.getElementById("avatar-input") as HTMLInputElement)?.click(); }}
            title="Нажми, чтобы сменить фото"
            role="button"
            aria-label="Сменить аватар"
            style={{
              position: "relative", width: 80, height: 80, borderRadius: 16, flexShrink: 0,
              background: userPhoto ? `url('${userPhoto}') center/cover` : "linear-gradient(135deg,var(--accent),var(--accent-4))",
              border: "2px solid var(--line)",
              cursor: photoUploading === "avatar" ? "wait" : "pointer",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              overflow: "hidden",
            }}>
            <span style={{
              width: "100%", textAlign: "center", fontSize: 10, fontWeight: 600,
              color: "#fff", background: "rgba(0,0,0,.45)", padding: "3px 0",
            }}>
              {photoUploading === "avatar" ? "…" : "Изменить"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <button className="btn btn-ghost btn-sm" disabled={photoUploading === "avatar"}
              onClick={() => (document.getElementById("avatar-input") as HTMLInputElement)?.click()}>
              {photoUploading === "avatar" ? "Загружаем..." : "⬆ Загрузить фото"}
            </button>
            {avatarUrl && (
              <button className="btn btn-sm" disabled={photoUploading === "avatar"}
                onClick={() => deletePhoto("avatar")}
                style={{ background: "rgba(255,45,111,.12)", border: "1px solid rgba(255,45,111,.25)", color: "var(--accent)" }}>
                ✕ Удалить фото
              </button>
            )}
            <p style={{ fontSize: 11, color: "var(--ink-dim)", margin: 0 }}>JPG, PNG или WebP · до 5 МБ</p>
          </div>
        </div>
        <input id="avatar-input" type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto("avatar", f); e.target.value = ""; }} />
      </div>

      <h3>Базовые данные</h3>
      <div className="field">
        <label>Ник</label>
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label>Город</label>
          <CitySelect value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        </div>
        <div className="field">
          <label>Опыт</label>
          <input value={form.experience} placeholder="напр. 3 года"
            onChange={(e) => setForm({ ...form, experience: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>О себе</label>
        <textarea rows={3} placeholder="Расскажи про свой косплей..."
          value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>
      {saveErr && (
        <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 10, padding: "8px 12px", background: "rgba(255,45,111,.1)", borderRadius: 8 }}>
          {saveErr}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary" onClick={saveBasics} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
        {saved && <span style={{ color: "var(--green)", fontSize: 13 }}>✓ Сохранено</span>}
      </div>
    </div>
  );
}
