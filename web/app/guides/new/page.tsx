"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GUIDE_ROLES = ["cosplayer", "workshop"];
const MAX_PHOTOS = 5;

export default function NewGuidePage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  const [canWrite, setCanWrite] = useState(false);   // роль косплеер/мастерская или админ
  const [isStaff, setIsStaff] = useState(false);
  const [f, setF] = useState({ title: "", category: "", summary: "", body: "" });
  const [cover, setCover] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);  // до 5 фото, вставляются в текст маркером [фото:N]
  const [preview, setPreview] = useState(false);     // живой предпросмотр статьи
  const [dragOver, setDragOver] = useState(false);   // подсветка зоны загрузки
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);   // гайд ушёл на модерацию (не-админ)
  const [err, setErr] = useState("");

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<number>(0);        // последняя позиция курсора в тексте
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Превью-ссылки на выбранные файлы (для миниатюр и предпросмотра).
  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);

  useEffect(() => {
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me) { router.replace("/auth/login?next=/guides/new"); return; }
        const roles: string[] = Array.isArray(me.roles) ? me.roles : [];
        setIsStaff(!!me.is_staff);
        setCanWrite(!!me.is_staff || roles.some((r) => GUIDE_ROLES.includes(r)));
        setOk(true);
      })
      .catch(() => router.replace("/auth/login?next=/guides/new"));
  }, [router]);

  const syncCaret = () => { if (bodyRef.current) caretRef.current = bodyRef.current.selectionStart; };

  // Вставка текста в позицию idx с аккуратными переносами строк.
  function insertAtIndex(text: string, idx: number) {
    setF((prev) => {
      const body = prev.body;
      const i = Math.max(0, Math.min(idx, body.length));
      const before = body.slice(0, i);
      const after = body.slice(i);
      const nb = before && !before.endsWith("\n") ? "\n" : "";
      const na = after && !after.startsWith("\n") ? "\n" : "";
      const insert = nb + text + na;
      const caret = (before + insert).length;
      requestAnimationFrame(() => {
        const el = bodyRef.current;
        if (el) { el.focus(); el.setSelectionRange(caret, caret); caretRef.current = caret; }
      });
      return { ...prev, body: before + insert + after };
    });
  }
  const insertMarker = (n: number, idx?: number) => insertAtIndex(`[фото:${n}]`, idx ?? caretRef.current);
  const insertMarkers = (idx: number, nums: number[]) => insertAtIndex(nums.map((n) => `[фото:${n}]`).join("\n"), idx);

  // Добавить файлы в список фото (с учётом лимита). Возвращает номера добавленных.
  function addFiles(files: File[]): number[] {
    const imgs = files.filter((x) => x.type.startsWith("image/"));
    if (!imgs.length) return [];
    const room = Math.max(0, MAX_PHOTOS - photos.length);
    const added = imgs.slice(0, room);
    if (!added.length) { setErr(`Максимум ${MAX_PHOTOS} фото`); return []; }
    setErr("");
    const startN = photos.length + 1;
    setPhotos((prev) => [...prev, ...added]);
    return added.map((_, k) => startN + k);
  }

  // Позиция курсора под точкой (x,y) — для дропа точно в место в тексте.
  function dropIndex(e: React.DragEvent): number | undefined {
    const doc = document as any;
    try {
      if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(e.clientX, e.clientY);
        if (pos) return pos.offset;
      } else if (doc.caretRangeFromPoint) {
        const r = doc.caretRangeFromPoint(e.clientX, e.clientY);
        if (r) return r.startOffset;
      }
    } catch { /* не поддерживается — упадём на позицию курсора */ }
    return undefined;
  }

  function onBodyDragOver(e: React.DragEvent) {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes("Files") || types.includes("text/guide-photo")) e.preventDefault();
  }
  function onBodyDrop(e: React.DragEvent) {
    const types = Array.from(e.dataTransfer.types);
    const isFiles = types.includes("Files");
    const raw = types.includes("text/guide-photo") ? e.dataTransfer.getData("text/guide-photo") : "";
    if (!isFiles && !raw) return;   // чужой дроп (напр. выделенный текст) — не мешаем
    e.preventDefault();
    const idx = dropIndex(e) ?? caretRef.current;
    if (isFiles) {
      const nums = addFiles(Array.from(e.dataTransfer.files || []));
      if (nums.length) insertMarkers(idx, nums);
    } else if (raw) {
      const n = parseInt(raw, 10);
      if (n) insertMarker(n, idx);
    }
  }

  function removePhoto(i: number) {
    // Удаляем фото и его маркер; следующие номера сдвигаются — перенумеровываем в тексте.
    setF((prev) => {
      let body = prev.body.replace(new RegExp(`\\[фото:${i + 1}\\]\\n?`, "g"), "");
      body = body.replace(/\[фото:(\d+)\]/g, (m, d) => {
        const num = parseInt(d, 10);
        return num > i + 1 ? `[фото:${num - 1}]` : m;
      });
      return { ...prev, body };
    });
    setPhotos((prev) => prev.filter((_, j) => j !== i));
  }

  async function submit() {
    if (!f.title.trim()) { setErr("Введите заголовок"); return; }
    setSaving(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", f.title); fd.append("category", f.category);
      fd.append("summary", f.summary); fd.append("body", f.body);
      if (cover) fd.append("cover", cover);
      const res = await fetch("/api/v1/guides/", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.title?.[0] || data.cover?.[0] || "Не удалось");
      // Фото грузим после создания гайда — по порядку, чтобы номера [фото:N] совпали
      for (const file of photos) {
        const pfd = new FormData();
        pfd.append("image", file);
        await fetch(`/api/v1/guides/${data.id}/photos/`, { method: "POST", credentials: "include", body: pfd });
      }
      // Админ публикует сразу → открываем гайд. Остальные — на модерацию (страница
      // гайда рендерится анонимно и вернёт 404, поэтому показываем экран «отправлено»).
      if (isStaff) router.push(`/guides/${data.id}`);
      else setSent(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  }

  if (ok === null) return <div className="wrap" style={{ padding: 48, color: "var(--ink-dim)" }}>Загрузка…</div>;

  if (sent) return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 760 }}>
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 32, marginTop: 12, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 24, margin: "0 0 10px" }}>Гайд отправлен на модерацию</h1>
        <p style={{ color: "var(--ink-dim)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Админ проверит его и опубликует. Придёт уведомление о решении. Если что-то не так — тоже сообщим с причиной.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <a href="/guides" className="btn btn-primary">К гайдам</a>
          <button className="btn btn-ghost" onClick={() => { setSent(false); setF({ title: "", category: "", summary: "", body: "" }); setCover(null); setPhotos([]); setPreview(false); }}>Написать ещё</button>
        </div>
      </div>
    </div>
  );

  if (!canWrite) return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 760 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/guides">Гайды</a><span className="sep">›</span><span className="cur">Новый гайд</span>
      </div>
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 28, marginTop: 12 }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 24, margin: "0 0 10px" }}>Гайды пишут косплееры и мастерские</h1>
        <p style={{ color: "var(--ink-dim)", lineHeight: 1.6, margin: "0 0 18px" }}>
          Публикация гайдов доступна профилям с ролью <b>Косплеер</b> или <b>Мастерская</b>. Добавь нужную роль в кабинете — и сможешь делиться туториалами по крафту.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/cabinet" className="btn btn-primary">Добавить роль в кабинете</a>
          <a href="/guides" className="btn btn-ghost">← К гайдам</a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 760 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/guides">Гайды</a><span className="sep">›</span><span className="cur">Новый гайд</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "8px 0 20px" }}>Написать гайд</h1>

      {!isStaff && (
        <div style={{ background: "rgba(124,249,255,.07)", border: "1px solid rgba(124,249,255,.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--ink-dim)" }}>
          После отправки гайд уйдёт на <b style={{ color: "var(--ink)" }}>модерацию</b> и появится в разделе «Гайды» после проверки админом. Статус увидишь в кабинете → «Мои гайды».
        </div>
      )}

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0 16px" }}>
          <div className="field"><label>Заголовок</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Как покрасить EVA без трещин" /></div>
          <div className="field"><label>Категория</label><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="EVA / Парики / Грим…" /></div>
        </div>
        <div className="field"><label>Кратко (анонс)</label><input value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="О чём гайд в одну строку" /></div>

        {/* Фото: перетаскивание файлов сюда + перетаскивание миниатюр в текст */}
        <div className="field">
          <label>Фото к гайду (до {MAX_PHOTOS})</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files || [])); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `1.5px dashed ${dragOver ? "var(--accent-2)" : "var(--line)"}`,
              background: dragOver ? "rgba(124,249,255,.08)" : "var(--bg-3)",
              borderRadius: 12, padding: "18px 16px", textAlign: "center", cursor: "pointer",
              color: "var(--ink-dim)", fontSize: 13, transition: "border-color .15s, background .15s",
            }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>⬆</div>
            Перетащи фото сюда или нажми, чтобы выбрать
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }} />
          </div>

          {photos.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
              {photos.map((p, i) => (
                <div key={i} draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/guide-photo", String(i + 1)); e.dataTransfer.effectAllowed = "copy"; }}
                  title="Перетащи в текст, чтобы вставить в нужное место"
                  style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--bg-3)", cursor: "grab" }}>
                  <div style={{ height: 84, backgroundImage: `url('${previews[i]}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
                  <div style={{ padding: "6px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ color: "var(--accent-2)", fontFamily: "var(--font-mono),monospace", fontSize: 12 }}>[фото:{i + 1}]</span>
                      <span style={{ display: "flex", gap: 4 }}>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }} onClick={() => insertMarker(i + 1)}>В текст</button>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }} onClick={() => removePhoto(i)}>✕</button>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <small style={{ display: "block", marginTop: 8, color: "var(--ink-dim)" }}>
            Перетащи миниатюру <b>в текст</b> — картинка встанет туда, куда бросишь. Или поставь курсор и нажми «В текст». Фото без маркера покажутся в конце гайда.
          </small>
        </div>

        {/* Текст с поддержкой дропа фото */}
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ margin: 0 }}>Текст</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview((v) => !v)}>
              {preview ? "← Редактировать" : "Предпросмотр"}
            </button>
          </div>
          {preview ? (
            <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginTop: 8, minHeight: 180, background: "var(--bg-3)" }}>
              <PreviewBody body={f.body} previews={previews} />
            </div>
          ) : (
            <textarea ref={bodyRef} rows={14} value={f.body}
              onChange={(e) => setF({ ...f, body: e.target.value })}
              onSelect={syncCaret} onClick={syncCaret} onKeyUp={syncCaret}
              onDragOver={onBodyDragOver} onDrop={onBodyDrop}
              placeholder="Полный текст гайда… Перетаскивай сюда фото, чтобы вставить картинку в нужное место." />
          )}
        </div>

        <div className="field"><label>Обложка (необязательно)</label><input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Отправляем…" : isStaff ? "Опубликовать" : "Отправить на модерацию"}
          </button>
          <a href="/guides" className="btn btn-ghost">Отмена</a>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}

// Живой предпросмотр: маркеры [фото:N] → миниатюры, остальное — текст с переносами.
function PreviewBody({ body, previews }: { body: string; previews: string[] }) {
  if (!body.trim()) return <span style={{ color: "var(--ink-dim)", fontSize: 14 }}>Пусто — начни писать текст.</span>;
  const parts = body.split(/\[фото:(\d+)\]/g);
  return (
    <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const url = previews[Number(part) - 1];
          return url
            ? <img key={i} src={url} alt={`Фото ${part}`} style={{ display: "block", width: "100%", borderRadius: 12, margin: "14px 0" }} />
            : <span key={i} style={{ color: "var(--red)" }}>[фото:{part} — не загружено]</span>;
        }
        return part ? <span key={i}>{part}</span> : null;
      })}
    </div>
  );
}
