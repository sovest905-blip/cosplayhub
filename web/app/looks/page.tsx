import { getLooks } from "../../lib/api";
import LooksGrid from "../components/LooksGrid";
import ComingSoon from "../components/ComingSoon";

export const dynamic = "force-dynamic";

export default async function LooksPage() {
  const looks = (await getLooks().catch(() => null)) || [];

  if (looks.length === 0) {
    return (
      <ComingSoon icon="✧" title="Образы"
        desc="Галерея косплей-образов: работы участников, теги по персонажам, лайки. Добавь свой образ в кабинете (роль «Косплеер»)." />
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Образы</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, margin: "8px 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display),sans-serif", fontSize: 30, margin: 0 }}>Образы</h1>
        <a href="/cabinet?tab=roles" className="btn btn-primary btn-sm">+ Добавить образ</a>
      </div>

      <LooksGrid looks={looks} />
    </div>
  );
}
