"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MessagesPanel from "../components/MessagesPanel";

function MessagesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toUser = params.get("to"); // ?to={userId} — начать диалог

  return (
    <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <div className="crumbs">
        <a href="/">Главная</a><span className="sep">›</span><span className="cur">Сообщения</span>
      </div>
      <MessagesPanel toUser={toUser} onToConsumed={() => router.replace("/messages")} />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingTop: 60, textAlign: "center", color: "var(--ink-dim)" }}>Загрузка...</div>}>
      <MessagesInner />
    </Suspense>
  );
}
