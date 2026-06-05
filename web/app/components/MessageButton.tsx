"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function MessageButton({
  userId,
  label = "Написать",
  className = "btn btn-primary",
  fullWidth = false,
}: {
  userId: number | null;
  label?: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const me = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (!me.ok) {
        router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const meData = await me.json();
      if (!userId || meData.id === userId) {
        // Себе писать нельзя — просто открываем мессенджер
        router.push("/messages");
        return;
      }
      router.push(`/messages?to=${userId}`);
    } catch {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={className}
      style={fullWidth ? { width: "100%", justifyContent: "center" } : undefined}
    >
      {label}
    </button>
  );
}
