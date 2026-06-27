"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// CTA тарифа на странице /pro. Free → регистрация. Pro → активировать триал
// (единый тариф покрывает профиль и мастерские).
export default function ProCta({
  planKey,
  label,
  highlight,
}: {
  planKey: "free" | "pro";
  label: string;
  highlight: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const cls = highlight ? "btn btn-primary" : "btn btn-ghost";
  const style = { width: "100%", justifyContent: "center" as const };

  if (planKey === "free") {
    return <a href="/auth/register" className={cls} style={style}>{label}</a>;
  }

  async function handle() {
    setLoading(true);
    try {
      const me = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (!me.ok) {
        router.push(`/auth/login?next=${encodeURIComponent("/pro")}`);
        return;
      }
      const r = await fetch("/api/v1/billing/activate/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ plan: "pro" }),
      });
      if (r.ok) router.push("/cabinet?tab=subs");
      else { const e = await r.json().catch(() => ({})); alert(e.detail || "Не удалось активировать"); }
    } catch {
      router.push(`/auth/login?next=${encodeURIComponent("/pro")}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handle} disabled={loading} className={cls} style={style}>
      {loading ? "..." : label}
    </button>
  );
}
