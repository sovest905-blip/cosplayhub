import { notFound } from "next/navigation";
import { getEvent } from "../../../lib/api";
import GoingButton from "../../components/GoingButton";

export const dynamic = "force-dynamic";

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return d; }
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) notFound();

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="crumbs" style={{ paddingTop: 16 }}>
        <a href="/">Главная</a>
        <span className="sep">›</span>
        <a href="/events">События</a>
        <span className="sep">›</span>
        <span className="cur">{e.title}</span>
      </div>

      <div className="profile-hero" style={{
        backgroundImage: e.cover ? `url('${e.cover}')` : "linear-gradient(135deg,rgba(157,124,255,.25),rgba(255,45,111,.15))",
        backgroundSize: "cover", backgroundPosition: "center",
      }} />

      <div style={{ display: "flex", alignItems: "start", gap: 20, flexWrap: "wrap", margin: "20px 0 24px" }}>
        <div style={{
          textAlign: "center", minWidth: 64, padding: "10px 12px",
          background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 14,
        }}>
          <div style={{ fontFamily: "var(--font-display),sans-serif", fontWeight: 800, fontSize: 30, lineHeight: 1 }}>{e.day}</div>
          <div style={{ fontSize: 11, color: "var(--accent-2)", textTransform: "uppercase", marginTop: 4 }}>{e.month}</div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: "clamp(26px,4vw,40px)", margin: "0 0 8px", letterSpacing: "-.02em" }}>
            {e.title}
          </h1>
          <div style={{ fontSize: 14, color: "var(--ink-dim)" }}>
            📅 {fmtDate(e.date)}{e.city ? <> · 📍 {e.place ? `${e.place}, ` : ""}{e.city}</> : null}
          </div>
        </div>
        <GoingButton eventId={e.id} initialGoing={e.is_going} initialTotal={e.going_total ?? e.going} />
      </div>

      <div className="profile-grid">
        <div>
          <div className="about">
            <h3>О событии</h3>
            {e.description
              ? <p style={{ whiteSpace: "pre-wrap" }}>{e.description}</p>
              : <p style={{ color: "var(--ink-dim)", fontStyle: "italic" }}>Описание появится позже.</p>}
          </div>
        </div>

        <div>
          <div className="about">
            <h3>Информация</h3>
            <div className="info-row"><span>Дата</span><span>{fmtDate(e.date)}</span></div>
            {e.city && <div className="info-row"><span>Город</span><span>{e.city}</span></div>}
            {e.place && <div className="info-row"><span>Место</span><span style={{ textAlign: "right" }}>{e.place}</span></div>}
            <div className="info-row"><span>Идут</span><span style={{ color: "var(--green)" }}>{e.going_total ?? e.going}</span></div>
          </div>

          {(e.attendees?.length ?? 0) > 0 && (
            <div className="about">
              <h3>Кто идёт</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {e.attendees.map((a) => (
                  <span key={a.user_id} className="role-badge">@{a.username}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
