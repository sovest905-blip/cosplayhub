"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// Кнопка «Пойду» на странице события. Неавторизованных ведёт на логин.
export default function GoingButton({
  eventId,
  initialGoing,
  initialTotal,
}: {
  eventId: number;
  initialGoing: boolean;
  initialTotal: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [going, setGoing] = useState(initialGoing);
  const [total, setTotal] = useState(initialTotal);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const me = await fetch("/api/v1/auth/me/", { credentials: "include" });
      if (!me.ok) { router.push(`/auth/login?next=${encodeURIComponent(pathname)}`); return; }
      const res = await fetch(`/api/v1/events/${eventId}/attend/`, {
        method: going ? "DELETE" : "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setGoing(!going);
        if (data && typeof data.going_total === "number") setTotal(data.going_total);
        else setTotal((t) => t + (going ? -1 : 1));
        router.refresh();
      }
    } finally { setBusy(false); }
  }

  return (
    <button
      className={going ? "btn btn-ghost" : "btn btn-primary"}
      disabled={busy}
      onClick={toggle}
    >
      {busy ? "..." : going ? "✓ Вы идёте · отменить" : `Пойду · ${total} идут`}
    </button>
  );
}
