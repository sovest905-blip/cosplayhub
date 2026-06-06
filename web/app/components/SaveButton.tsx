"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function SaveButton({
  kind,
  objectId,
  className = "btn btn-ghost",
  fullWidth = false,
}: {
  kind: "profile" | "workshop";
  objectId: number | null;
  className?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!objectId) { setReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/favorites/${kind}/${objectId}/`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSaved(!!data.favorited);
        }
      } catch {
        /* аноним — клик уведёт на логин */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [kind, objectId]);

  async function toggle() {
    if (!objectId) return;
    setLoading(true);
    try {
      const meRes = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (!meRes.ok) {
        router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const res = await fetch(`/api/v1/favorites/${kind}/${objectId}/`, {
        method: saved ? "DELETE" : "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaved(!!data.favorited);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !ready}
      className={className}
      style={fullWidth ? { width: "100%", justifyContent: "center" } : undefined}
    >
      {saved ? "♥ В избранном" : "♡ Сохранить"}
    </button>
  );
}
