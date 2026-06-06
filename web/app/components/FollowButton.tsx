"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function FollowButton({
  userId,
  className = "btn btn-ghost",
  fullWidth = false,
}: {
  userId: number | null;
  className?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [isSelf, setIsSelf] = useState(false);

  useEffect(() => {
    if (!userId) { setReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/v1/auth/me/", { credentials: "include" });
        if (meRes.ok) {
          const me = await meRes.json();
          if (!cancelled && me.id === userId) { setIsSelf(true); setReady(true); return; }
        }
        const res = await fetch(`/api/v1/follow/${userId}/`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setFollowing(!!data.following);
        }
      } catch {
        /* аноним — оставим following=false, клик уведёт на логин */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function toggle() {
    if (!userId) return;
    setLoading(true);
    try {
      const meRes = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (!meRes.ok) {
        router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const res = await fetch(`/api/v1/follow/${userId}/`, {
        method: following ? "DELETE" : "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setFollowing(!!data.following);
        router.refresh(); // обновить счётчик подписчиков (SSR)
      }
    } finally {
      setLoading(false);
    }
  }

  if (isSelf) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading || !ready}
      className={`${className}${following ? " is-following" : ""}`}
      style={fullWidth ? { width: "100%", justifyContent: "center" } : undefined}
    >
      {following ? "✓ Вы подписаны" : "Подписаться"}
    </button>
  );
}
