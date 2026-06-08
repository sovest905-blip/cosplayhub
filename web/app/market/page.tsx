import { getPublicListings } from "../../lib/api";
import ComingSoon from "../components/ComingSoon";
import PostListingButton from "../components/PostListingButton";
import MarketListings from "../components/MarketListings";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const items = (await getPublicListings("sell,buy").catch(() => null)) || [];

  if (items.length === 0) {
    return (
      <ComingSoon icon="✄" title="Барахолка"
        desc="Продажа и обмен б/у костюмов, париков, реквизита и материалов. Размести объявление в кабинете." />
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

      <MarketListings items={items} />
    </div>
  );
}
