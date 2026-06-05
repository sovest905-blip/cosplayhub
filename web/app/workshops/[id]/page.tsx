import { WORKSHOPS } from "../../../lib/mock";
import { notFound } from "next/navigation";
import GatedButton from "../../components/GatedButton";

const SERVICES = [
  { name: "Базовая деталь (до 20 см)", price: 3500 },
  { name: "Средняя деталь (20–40 см)", price: 7000 },
  { name: "Большая деталь (40+ см)", price: 14000 },
  { name: "Оружие полноразмер", price: 25000 },
  { name: "Полный комплект брони", price: 80000 },
];

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = WORKSHOPS.find((x) => x.id === Number(id));
  if (!w) notFound();

  return (
    <div className="wrap">
      <div className="crumbs">
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <a href="/workshops">Мастерские</a>
        <span className="sep">›</span>
        <span className="cur">{w.name}</span>
      </div>

      <div className="profile-hero">
        <img src={w.cover} alt={w.name} />
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
          <GatedButton className="btn btn-primary">Заказать</GatedButton>
          <GatedButton className="btn btn-ghost">Сохранить</GatedButton>
        </div>
      </div>

      <div className="profile-mini-stats">
        <div className="pmsi"><b>★ {w.rating}</b><span>Рейтинг</span></div>
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
          <div className="about">
            <h3>Прайс-лист</h3>
            {SERVICES.map((s, i) => (
              <div key={i} className="info-row">
                <span style={{ color: "var(--ink)", fontSize: 13 }}>{s.name}</span>
                <b style={{ color: "var(--accent-3)", fontFamily: "var(--font-display),sans-serif", fontSize: 13 }}>
                  от {s.price.toLocaleString()} ₸
                </b>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="about">
            <h3>Информация</h3>
            <div className="info-row"><span>Тип</span><span>{w.type}</span></div>
            <div className="info-row"><span>Город</span><span>{w.city}</span></div>
            <div className="info-row"><span>Срок</span><span>{w.eta}</span></div>
            <div className="info-row"><span>Рейтинг</span><span style={{ color: "var(--accent-3)" }}>★ {w.rating}</span></div>
            <div className="info-row">
              <span>Статус</span>
              <span style={{ color: "var(--green)" }}>Принимает заказы</span>
            </div>
          </div>

          <div className="about" style={{ background: "linear-gradient(135deg,rgba(124,249,255,.08),rgba(255,45,111,.05))", border: "1px solid rgba(124,249,255,.2)" }}>
            <h3 style={{ color: "var(--accent-2)" }}>Эскроу-сделка</h3>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 12 }}>
              Безопасная оплата: деньги хранятся на платформе до завершения заказа.
            </p>
            <GatedButton className="btn btn-primary" fullWidth>
              Оставить заявку
            </GatedButton>
          </div>
        </div>
      </div>
    </div>
  );
}
