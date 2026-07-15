// Вкладка «Мои заказы» кабинета. Вынесена из page.tsx (god-компонент).
import EmptyBlock from "./EmptyBlock";

const ORDER_STATUS_COLORS: Record<string, string> = {
  request: "var(--accent-2)", accepted: "var(--green)", in_work: "var(--accent-3)",
  shipped: "#7cf9ff", done: "var(--green)", cancelled: "var(--ink-dim)",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  request: "Заявка", accepted: "Принят", in_work: "В работе",
  shipped: "Отправлен", done: "Получен", cancelled: "Отменён",
};

type MyOrder = {
  id: number; workshop: number; workshop_name: string; description: string;
  budget: number | null; deadline: string | null; status: string; has_review?: boolean;
  created_at: string;
};

type Props = {
  myOrders: MyOrder[];
  ordersCount: number;
  reviewFor: number | null; setReviewFor: (id: number | null) => void;
  revRating: number; setRevRating: (n: number) => void;
  revText: string; setRevText: (v: string) => void;
  revBusy: boolean;
  submitReview: (orderId: number) => void;
};

export default function OrdersTab({
  myOrders, ordersCount, reviewFor, setReviewFor, revRating, setRevRating, revText, setRevText, revBusy, submitReview,
}: Props) {
  return (
    <div className="acc-card">
      <h3 style={{ marginBottom: 14 }}>Мои заказы{ordersCount > 0 ? ` (${ordersCount})` : ""}</h3>
      {myOrders.length === 0 ? (
        <EmptyBlock icon="⚒" title="Заказов пока нет"
          sub="Когда ты сделаешь заказ в мастерскую — он появится здесь." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {myOrders.map((o) => (
            <div key={o.id} style={{
              padding: "14px 16px", background: "var(--bg-2)",
              border: "1px solid var(--line)", borderRadius: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>→ {o.workshop_name}</div>
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                  background: "rgba(0,0,0,.3)",
                  color: ORDER_STATUS_COLORS[o.status] || "var(--ink)",
                  border: `1px solid ${ORDER_STATUS_COLORS[o.status] || "var(--line)"}33`,
                }}>
                  {ORDER_STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 10px", lineHeight: 1.5 }}>
                {o.description}
              </p>
              <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ink-dim)", flexWrap: "wrap", alignItems: "center" }}>
                {o.budget ? <span>Бюджет: <b style={{ color: "var(--accent-3)" }}>{o.budget.toLocaleString()} ₸</b></span> : null}
                {o.deadline ? <span>Дедлайн: {o.deadline}</span> : null}
                <span>{new Date(o.created_at).toLocaleDateString("ru-RU")}</span>
                {o.status === "done" && (o.has_review
                  ? <span style={{ color: "var(--green)" }}>✓ Отзыв оставлен</span>
                  : <button className="btn btn-ghost btn-sm" onClick={() => { setReviewFor(reviewFor === o.id ? null : o.id); setRevRating(5); setRevText(""); }}>
                      Оставить отзыв
                    </button>)}
              </div>
              {reviewFor === o.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <div style={{ marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} onClick={() => setRevRating(n)} style={{
                        cursor: "pointer", fontSize: 22, marginRight: 2,
                        color: n <= revRating ? "var(--accent-3)" : "var(--line)",
                      }}>★</span>
                    ))}
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <textarea placeholder="Как прошёл заказ? (необязательно)" value={revText}
                      onChange={(e) => setRevText(e.target.value)} />
                  </div>
                  <button className="btn btn-primary btn-sm" disabled={revBusy} onClick={() => submitReview(o.id)}>
                    {revBusy ? "..." : "Отправить отзыв"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
