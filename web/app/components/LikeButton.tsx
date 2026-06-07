"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function LikeButton({
  lookId, initialLiked, initialCount,
}: {
  lookId: number; initialLiked: boolean; initialCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const me = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (!me.ok) { router.push(`/auth/login?next=${encodeURIComponent(pathname)}`); return; }
      const res = await fetch(`/api/v1/looks/${lookId}/like/`, {
        method: liked ? "DELETE" : "POST", credentials: "include",
      });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        setLiked(!!d.is_liked);
        setCount(typeof d.likes_count === "number" ? d.likes_count : count);
      }
    } finally { setLoading(false); }
  }

  return (
    <button onClick={toggle} disabled={loading}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
        background: "transparent", color: liked ? "var(--accent)" : "var(--ink-dim)",
        fontSize: 14, fontWeight: 600, padding: 0,
      }}>
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}
