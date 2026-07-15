// Вкладка «Фотогалерея» кабинета. Вынесена из page.tsx (god-компонент). Единственный
// владелец galleryBlock() теперь — этот файл (в RolesTab.tsx есть своя независимая копия
// для анкет ролей, в page.tsx она больше не нужна).
import { galleryLimit } from "../../lib/roleForms";

type Photo = { id: number; url: string };

type Props = {
  roles: string[]; isPro: boolean;
  photos: Photo[]; photoUp: boolean; photoErr: string;
  uploadGalleryPhoto: (file: File) => void; deleteGalleryPhoto: (id: number) => void;
  goToRoles: () => void;
};

export default function GalleryTab({ roles, isPro, photos, photoUp, photoErr, uploadGalleryPhoto, deleteGalleryPhoto, goToRoles }: Props) {
  const gLimit = galleryLimit(roles, isPro);

  function galleryBlock(title: string, hint: string) {
    const limit = gLimit;
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>{title}</h4>
          <span style={{ fontSize: 12, color: photos.length >= limit ? "var(--accent-3)" : "var(--ink-dim)" }}>
            {photos.length} / {limit}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 12px" }}>{hint} До {limit} фото, каждое ≤5 МБ.</p>
        {!isPro && photos.length >= limit && (
          <p style={{ fontSize: 12, color: "var(--accent-3)", margin: "0 0 12px" }}>
            Лимит достигнут. <a href="/pro" style={{ color: "var(--accent-2)", fontWeight: 600 }}>Pro</a> поднимает галерею до {limit * 4} фото.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
              <div style={{ width: "100%", height: "100%", backgroundImage: `url('${p.url}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
              <button onClick={() => deleteGalleryPhoto(p.id)} title="Удалить"
                style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%",
                  border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
          {photos.length < limit && (
            <label style={{ aspectRatio: "1", borderRadius: 10, border: "1px dashed var(--line)", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: photoUp ? "wait" : "pointer", color: "var(--ink-dim)", fontSize: 26 }}>
              {photoUp ? "…" : "+"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={photoUp}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadGalleryPhoto(f); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {photoErr && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{photoErr}</p>}
      </div>
    );
  }

  return (
    <div className="acc-card">
      <h2 style={{ margin: "0 0 4px" }}>Фотогалерея</h2>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
        Общая галерея профиля — образы, портреты, работы. Видна на твоей странице.
      </p>
      {gLimit > 0 ? (
        galleryBlock("Мои фото", "Загрузи лучшие кадры.")
      ) : (
        <div style={{ padding: "18px 16px", background: "var(--bg-3)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <p style={{ fontSize: 14, margin: "0 0 12px" }}>
            Фотогалерея доступна для ролей <b>Косплеер</b>, <b>Фотограф</b> или <b>Локация</b>.
            Добавь роль — и сможешь загружать фото.
          </p>
          <button className="btn btn-primary btn-sm" onClick={goToRoles}>Перейти к ролям →</button>
        </div>
      )}
    </div>
  );
}
