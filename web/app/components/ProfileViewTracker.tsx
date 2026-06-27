"use client";
import { useEffect } from "react";

// Пингует просмотр профиля (Pro-льгота «кто смотрел»). SSR-фетч детальной идёт
// анонимно, поэтому фиксируем просмотр с клиента — там есть сессия. Бэкенд сам
// игнорирует анонимов, свой профиль и дублирует один раз в день.
export default function ProfileViewTracker({ id }: { id: string | number }) {
  useEffect(() => {
    fetch(`/api/v1/profiles/${id}/view/`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [id]);
  return null;
}
