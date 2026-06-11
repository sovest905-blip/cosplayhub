"use client";

import { useEffect, useState, type ReactNode } from "react";

// Показывает children только владельцу профиля (me.id === ownerId).
// Остальным (и неавторизованным) — fallback. Страницы профилей серверные,
// поэтому проверка владельца делается на клиенте через /auth/me.
export default function OwnerOnly({
  ownerId,
  children,
  fallback = null,
}: {
  ownerId: number | null;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ownerId) { setIsOwner(false); return; }
    fetch("/api/v1/auth/me/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setIsOwner(!!me && me.id === ownerId))
      .catch(() => setIsOwner(false));
  }, [ownerId]);

  if (isOwner === null) return <>{fallback}</>;
  return <>{isOwner ? children : fallback}</>;
}
