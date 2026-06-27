import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// Кастомный URL Pro-профиля: /u/<slug> → резолвим в профиль и редиректим на /people/<id>.
export default async function SlugProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://web:8000/api/v1";
  let pid: number | null = null;
  try {
    const res = await fetch(`${base}/profiles/by-slug/${encodeURIComponent(slug)}/`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      pid = d.profile_id ?? null;
    }
  } catch {
    pid = null;
  }
  if (!pid) notFound();
  redirect(`/people/${pid}`);
}
