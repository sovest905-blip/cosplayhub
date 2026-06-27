import { getPublicListings } from "../../lib/api";
import EmptyState from "../components/EmptyState";
import PostListingButton from "../components/PostListingButton";
import JobListings from "../components/JobListings";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const items = (await getPublicListings("job,collab").catch(() => null)) || [];

  if (items.length === 0) {
    return (
      <EmptyState icon="⚒" title="Слоты и коллабы"
        desc="Пока нет открытых слотов и коллабов. Ищете фотографа или пару на сет? Разместите запрос в кабинете."
        ctaHref="/cabinet?tab=listings" ctaLabel="+ Разместить" />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Слоты и коллабы</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Слоты и коллабы</h1>
        <PostListingButton />
      </div>

      <JobListings items={items} />
    </div>
  );
}
