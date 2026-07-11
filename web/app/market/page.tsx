import { getPublicListings } from "../../lib/api";
import EmptyState from "../components/EmptyState";
import PostListingButton from "../components/PostListingButton";
import MarketListings from "../components/MarketListings";
import PartnerFeedCard from "../components/PartnerFeedCard";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const items = (await getPublicListings("sell,buy").catch(() => null)) || [];

  if (items.length === 0) {
    return (
      <EmptyState icon="✄" title="Барахолка"
        desc="Пока пусто. Продажа и обмен б/у костюмов, париков, реквизита и материалов — разместите объявление в кабинете."
        ctaHref="/cabinet?tab=listings" ctaLabel="+ Разместить объявление" />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Барахолка</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Барахолка</h1>
        <PostListingButton />
      </div>

      <PartnerFeedCard />
      <MarketListings items={items} />
    </div>
  );
}
