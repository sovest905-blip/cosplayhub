// Вкладка «Прокат костюмов» кабинета. Вынесена из page.tsx (god-компонент).
type Props = {
  myCostumes: any[] | null; setMyCostumes: (v: any[]) => void;
  myRentals: any[] | null;
};

export default function RentTab({ myCostumes, setMyCostumes, myRentals }: Props) {
  const refetchCostumes = () => fetch("/api/v1/costumes/?mine=1", { credentials: "include" })
    .then((r) => r.ok ? r.json() : null).then((d) => { const l = d?.results ?? d; if (Array.isArray(l)) setMyCostumes(l); });
  const decideRental = async (reqId: number, st: string) => {
    await fetch(`/api/v1/rentals/${reqId}/`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: st }) });
    refetchCostumes();
  };
  const costumes = myCostumes || [];
  const rentals = myRentals || [];
  const RENT_RU: Record<string, string> = { pending: "Заявка", approved: "Подтверждена", declined: "Отклонена", cancelled: "Отменена" };
  return (
    <div className="acc-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Прокат костюмов</h2>
        <a href="/rent/new" className="btn btn-primary btn-sm">+ Сдать костюм</a>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 18px" }}>
        Сдавайте свои костюмы и берите чужие. Оплата и залог — напрямую с второй стороной.
      </p>

      <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 8px" }}>Мои костюмы ({costumes.length})</h3>
      {costumes.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: "0 0 16px" }}>Вы пока не выставляли костюмы.</p>}
      {costumes.map((c) => {
        const pend = (c.requests || []).filter((r: any) => r.status === "pending");
        return (
          <div key={c.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
            <div className="info-row" style={{ alignItems: "center", border: "none", padding: 0 }}>
              <a href={`/rent/${c.id}`} style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</a>
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {c.price_day != null ? `${Number(c.price_day).toLocaleString("ru-RU")} ₸/сут` : "договорная"} · {c.status_display}
              </span>
            </div>
            {pend.length > 0 && (
              <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                {pend.map((r: any) => (
                  <div key={r.id} className="info-row" style={{ alignItems: "center" }}>
                    <span style={{ fontSize: 13 }}>@{r.username}{(r.date_from || r.date_to) && <span style={{ color: "var(--ink-dim)" }}> · {r.date_from || "?"}–{r.date_to || "?"}</span>}</span>
                    <span style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-primary btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => decideRental(r.id, "approved")}>принять</button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => decideRental(r.id, "declined")}>откл.</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <h3 style={{ fontSize: 13, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: ".1em", margin: "18px 0 8px" }}>Мои аренды ({rentals.length})</h3>
      {rentals.length > 0 ? rentals.map((r) => (
        <a key={r.id} href={`/rent/${r.costume.id}`} className="info-row" style={{ alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>{r.costume.title}</span>
          <span style={{ fontSize: 12, color: r.status === "approved" ? "var(--green)" : "var(--ink-dim)" }}>{RENT_RU[r.status] || r.status}</span>
        </a>
      )) : <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0 }}>Вы ничего не арендовали. <a href="/rent">Каталог проката</a>.</p>}
    </div>
  );
}
