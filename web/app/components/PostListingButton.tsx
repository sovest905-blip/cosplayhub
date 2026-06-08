"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Кнопка «Разместить объявление». Читать витрину может любой (гость тоже),
// а публиковать — только зарегистрированный: гостя ведём на вход и возвращаем
// обратно к форме объявлений в кабинете.
export default function PostListingButton({
  label = "+ Разместить",
  className = "btn btn-primary btn-sm",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const target = "/cabinet?tab=listings";

  async function handle() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (r.ok) router.push(target);
      else router.push(`/auth/login?next=${encodeURIComponent(target)}`);
    } catch {
      router.push(`/auth/login?next=${encodeURIComponent(target)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handle} disabled={loading} className={className}>
      {label}
    </button>
  );
}
