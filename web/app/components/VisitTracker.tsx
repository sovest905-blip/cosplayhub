"use client";
import { useEffect } from "react";

// Считает посещение сайта — один пинг за сессию вкладки (а не на каждый клик),
// чтобы в админ-дашборде был счётчик посещений, а не просмотров страниц.
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("visit_tracked")) return;
      sessionStorage.setItem("visit_tracked", "1");
      fetch("/api/v1/analytics/track/", { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      /* приватный режим без sessionStorage — молча пропускаем */
    }
  }, []);
  return null;
}
