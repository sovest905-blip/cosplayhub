// Вкладка «Входящие заказы» (Отклики) кабинета. Вынесена из page.tsx (god-компонент).
import EmptyBlock from "./EmptyBlock";

const ORDER_STATUS_COLORS: Record<string, string> = {
  request: "var(--accent-2)", accepted: "var(--green)", in_work: "var(--accent-3)",
  shipped: "#7cf9ff", done: "var(--green)", cancelled: "var(--ink-dim)",
};

type IncomingOrder = {
  id: number; workshop_name: string; customer_username: string;
  description: string; budget: number | null; status: string; status_display: string;
  created_at: string;
};

type Props = {
  incomingOrders: IncomingOrder[];
  newIncoming: number;
  updateIncomingStatus: (orderId: number, newStatus: string) => void;
};

export default function ResponsesTab({ incomingOrders, newIncoming, updateIncomingStatus }: Props) {
  return (
    <div className="acc-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Входящие заказы{incomingOrders.length > 0 ? ` (${incomingOrders.length})` : ""}</h3>
        {newIncoming > 0 && (
          <span style={{ fontSize: 12, padding: "3px 10px", background: "rgba(124,249,255,.15)", color: "var(--accent-2)", border: "1px solid rgba(124,249,255,.3)", borderRadius: 20 }}>
            {newIncoming} новых
          </span>
        )}
      </div>
      {incomingOrders.length === 0 ? (
        <EmptyBlock icon="↗" title="Откликов пока нет"
          sub="Когда косплееры оставят заявку в вашу мастерскую — они появятся здесь." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {incomingOrders.map((order) => (
            <div key={order.id} style={{
              padding: "14px 16px", background: "var(--bg-2)",
              border: "1px solid var(--line)", borderRadius: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>@{order.customer_username}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>→ {order.workshop_name}</div>
                </div>
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                  background: "rgba(0,0,0,.3)",
                  color: ORDER_STATUS_COLORS[order.status] || "var(--ink)",
                  border: `1px solid ${ORDER_STATUS_COLORS[order.status] || "var(--line)"}33`,
                }}>
                  {order.status_display}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 10px", lineHeight: 1.5 }}>
                {order.description}
              </p>
              {order.budget && (
                <div style={{ fontSize: 12, color: "var(--accent-3)", marginBottom: 10 }}>
                  Бюджет: {order.budget.toLocaleString()} ₸
                </div>
              )}
              {order.status === "request" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => updateIncomingStatus(order.id, "accepted")}>
                    Принять
                  </button>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => updateIncomingStatus(order.id, "cancelled")}
                    style={{ color: "var(--ink-dim)" }}>
                    Отклонить
                  </button>
                </div>
              )}
              {order.status === "accepted" && (
                <button className="btn btn-ghost btn-sm"
                  onClick={() => updateIncomingStatus(order.id, "in_work")}>
                  Взять в работу
                </button>
              )}
              {order.status === "in_work" && (
                <button className="btn btn-ghost btn-sm"
                  onClick={() => updateIncomingStatus(order.id, "shipped")}>
                  Отметить как отправлено
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
