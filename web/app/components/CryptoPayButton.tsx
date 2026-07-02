"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Кнопка крипто-оплаты через Cryptomus. Создаёт инвойс на бэке и уводит на
// страницу оплаты. purpose="pro" (продление Pro) или "donate_site" (донат сайту).
export default function CryptoPayButton({
  purpose,
  months = 1,
  amount,
  label,
  className = "btn btn-primary",
  style,
  nextPath = "/pro",
}: {
  purpose: "pro" | "donate_site";
  months?: number;
  amount?: number;
  label: string;
  className?: string;
  style?: React.CSSProperties;
  nextPath?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function pay() {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { purpose };
      if (purpose === "pro") body.months = months;
      if (purpose === "donate_site") body.amount = amount;

      const r = await fetch("/api/v1/billing/pay/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (r.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      if (r.status === 503) {
        alert("Крипто-оплата пока не подключена. Загляните чуть позже.");
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) {
        window.location.href = d.url; // страница оплаты Cryptomus
      } else {
        alert(d.detail || "Не удалось создать платёж");
      }
    } catch {
      alert("Сеть недоступна, попробуйте позже");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={pay} disabled={loading} className={className} style={style}>
      {loading ? "..." : label}
    </button>
  );
}
