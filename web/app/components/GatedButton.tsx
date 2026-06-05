"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function GatedButton({
  children,
  className = "btn btn-primary",
  style,
  fullWidth = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (r.ok) {
        // Залогинен — функционал в разработке (заказы/сообщения появятся позже)
        alert("Скоро будет доступно");
      } else {
        // Аноним — на вход, потом вернём обратно
        router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      }
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
      style={{ ...(fullWidth ? { width: "100%", justifyContent: "center" } : {}), ...style }}
    >
      {children}
    </button>
  );
}
