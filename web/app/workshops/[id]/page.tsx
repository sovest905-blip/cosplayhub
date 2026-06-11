import { WORKSHOPS } from "../../../lib/mock";
import { notFound } from "next/navigation";
import GatedButton from "../../components/GatedButton";
import OrderButton from "../../components/OrderButton";
import SaveButton from "../../components/SaveButton";
import { getWorkshop, getWorkshopReviews, type Shop, type WorkshopReview } from "../../../lib/api";

export const dynamic = "force-dynamic";

const FALLBACK_SERVICES = [
  { id: 1, name: "Базовая деталь (до 20 см)", description: "", price_from: 3500 },
  { id: 2, name: "Средняя деталь (20–40 см)", description: "", price_from: 7000 },
  { id: 3, name: "Большая деталь (40+ см)", description: "", price_from: 14000 },
  { id: 4, name: "Оружие полноразмер", description: "", price_from: 25000 },
  { id: 5, name: "Полный комплект брони", description: "", price_from: 80000 },
];

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiWorkshop = await getWorkshop(id);
  const mockWorkshop = WORKSHOPS.find((x) => x.id === Number(id));
  const w = (apiWorkshop || (mockWorkshop as unknown as Shop)) as Shop;
  if (!w) notFound();

  const reviews: WorkshopReview[] = apiWorkshop ? await getWorkshopReviews(id) : [];
  const hasRating = (w.reviews_count ?? 0) > 0 && Number(w.rating) > 0;

  return (
    <div className="wrap">
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <a href="/workshops">Мастерские</a>
        <span className="sep">›</span>
        <span className="cur">{w.name}</span>
      </div>

      <div className="profile-hero" style={{
        backgroundImage: w.cover ? `url('${w.cover}')` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        {w.is_pro && (
          <div className="avail-pill" style={{ background: "rgba(255,210,74,.2)", color: "var(--accent-3)", border: "1px solid rgba(255,210,74,.4)" }}>
            PRO-мастерская
          </div>
        )}
      </div>

      <div className="profile-head">
        <div className="avatar" style={{
          backgroundImage: `url('${w.cover}')`,
          borderRadius: 16,
        }} />
        <div className="profile-meta">
          <h1>{w.name}</h1>
          <div className="role">{w.type} · {w.city}</div>
          <div className="roles-line">
            <span className="role-badge">{w.type}</span>
            {w.is_pro && (
              <span className="role-badge" style={{ background: "rgba(255,210,74,.08)", color: "var(--accent-3)", borderColor: "rgba(255,210,74,.2)" }}>PRO</span>
            )}
          </div>
        </div>
        <div className="profile-actions">
          {apiWorkshop
            ? <OrderButton workshopId={w.id} label="Заказать" className="btn btn-primary" />
            : <GatedButton className="btn btn-primary">Заказать</GatedButton>}
          <SaveButton kind="workshop" objectId={apiWorkshop ? w.id : null} className="btn btn-ghost" />
        </div>
      </div>

      <div className="profile-mini-stats">
        <div className="pmsi"><b>{hasRating ? `★ ${w.rating}` : "—"}</b><span>{hasRating ? `Рейтинг · ${w.reviews_count}` : "Нет отзывов"}</span></div>
        <div className="pmsi"><b>{w.orders}+</b><span>Заказов</span></div>
        <div className="pmsi"><b>{w.eta}</b><span>Срок</span></div>
        <div className="pmsi"><b>{w.city}</b><span>Город</span></div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="about">
            <h3>О мастерской</h3>
            <p>{w.description}</p>
          </div>
          {(w.photos?.length ?? 0) > 0 && (
            <div className="about">
              <h3>Примеры работ</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }}>
                {w.photos.map((ph) => (
                  <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" style={{
                    aspectRatio: "1", borderRadius: 10, display: "block",
                    backgroundImage: `url('${ph.url}')`, backgroundSize: "cover", backgroundPosition: "center",
                  }} />
                ))}
              </div>
            </div>
          )}

          <div className="about">
            <h3>Прайс-лист</h3>
            {(w.services && w.services.length > 0 ? w.services : FALLBACK_SERVICES).map((s) => (
              <div key={s.id} className="info-row">
                <span style={{ color: "var(--ink)", fontSize: 13 }}>{s.name}</span>
                <b style={{ color: "var(--accent-3)", fontFamily: "var(--font-display),sans-serif", fontSize: 13 }}>
                  от {s.price_from.toLocaleString()} ₸
                </b>
              </div>
            ))}
          </div>

          <div className="about">
            <h3>Отзывы{reviews.length > 0 && <span style={{ color: "var(--ink-dim)", fontWeight: 400, fontSize: 13 }}> · {reviews.length}</span>}</h3>
            {reviews.length > 0 ? (
              reviews.map((r) => (
                <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                    <b>@{r.author_username}</b>
                    <span style={{ color: "var(--accent-3)" }}>{"★".repeat(r.rating)}<span style={{ opacity: .3 }}>{"★".repeat(5 - r.rating)}</span></span>
                  </div>
                  {r.text && <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "6px 0 0", lineHeight: 1.5 }}>{r.text}</p>}
                </div>
              ))
            ) : (
              <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
                Отзывов пока нет. Отзыв может оставить заказчик после завершённого заказа.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="about">
            <h3>Информация</h3>
            <div className="info-row"><span>Тип</span><span>{w.type}</span></div>
            <div className="info-row"><span>Город</span><span>{w.city}</span></div>
            <div className="info-row"><span>Срок</span><span>{w.eta}</span></div>
            <div className="info-row"><span>Рейтинг</span>
              {hasRating
                ? <span style={{ color: "var(--accent-3)" }}>★ {w.rating} · {w.reviews_count} отз.</span>
                : <span style={{ color: "var(--ink-dim)" }}>Пока нет отзывов</span>}
            </div>
            <div className="info-row">
              <span>Статус</span>
              <span style={{ color: "var(--green)" }}>Принимает заказы</span>
            </div>
          </div>

          <div className="about" style={{ background: "linear-gradient(135deg,rgba(124,249,255,.08),rgba(255,45,111,.05))", border: "1px solid rgba(124,249,255,.2)" }}>
            <h3 style={{ color: "var(--accent-2)" }}>Заказать у мастерской</h3>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>
              Опишите, что нужно сделать — мастерская ответит в сообщениях.
            </p>
            {apiWorkshop
              ? <OrderButton workshopId={w.id} label="Оставить заявку" className="btn btn-primary" fullWidth />
              : <GatedButton className="btn btn-primary" fullWidth>Оставить заявку</GatedButton>}
          </div>
        </div>
      </div>
    </div>
  );
}
