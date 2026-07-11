import { notFound } from "next/navigation";
import MessageButton from "../../components/MessageButton";
import ProductGallery from "../../components/ProductGallery";
import { getProduct, PRODUCT_STATUS_META, fmtPrice } from "../../../lib/api";

export const dynamic = "force-dynamic";

const PH = "https://images.unsplash.com/photo-1513094735237-8f2714d57c13?w=800&q=80";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p) notFound();

  const st = PRODUCT_STATUS_META[p.status] || { label: p.status_display, color: "var(--ink-dim)" };
  // Галерея: обложка (image) + доп. фото; если пусто — плейсхолдер.
  const cover = p.image || p.image_url;
  const gallery = [
    ...(cover ? [{ id: "cover", url: cover }] : []),
    ...(p.photos || []).map((ph) => ({ id: ph.id, url: ph.url })),
  ];
  if (gallery.length === 0) gallery.push({ id: "ph", url: PH });

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 56 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span>
        <a href="/shops">Магазины</a><span className="sep">›</span>
        {p.owner_id ? <><a href={`/people/${p.owner_id}`}>@{p.owner_name}</a><span className="sep">›</span></> : null}
        <span className="cur">{p.title}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 28, alignItems: "start", marginTop: 8 }}
           className="product-grid">
        <ProductGallery images={gallery} title={p.title} />

        <div>
          {p.category && <div className="eyebrow" style={{ marginBottom: 8 }}>{p.category}</div>}
          <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 28, margin: "0 0 10px" }}>{p.title}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 24, fontWeight: 700 }}>{fmtPrice(p.price)}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: st.color, border: `1px solid ${st.color}`, borderRadius: 20, padding: "3px 12px", opacity: 0.9 }}>
              {st.label}
            </span>
          </div>

          {p.description && <p style={{ color: "var(--ink-dim)", fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-line" }}>{p.description}</p>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
            <MessageButton userId={p.owner_id ?? null} className="btn btn-primary" label="Написать продавцу" />
            {p.owner_id ? <a href={`/people/${p.owner_id}`} className="btn btn-ghost">Профиль магазина</a> : null}
          </div>

          <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 16 }}>
            Оплата и доставка обсуждаются с продавцом в личных сообщениях. Платёжная система появится позже.
          </p>
        </div>
      </div>
    </div>
  );
}
