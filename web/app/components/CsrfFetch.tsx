"use client";
import { useEffect } from "react";

/**
 * Глобально добавляет заголовок X-CSRFToken (из cookie csrftoken) ко всем
 * мутирующим (POST/PUT/PATCH/DELETE) запросам к нашему API (/api/...).
 *
 * Бэкенд теперь проверяет CSRF штатно (SessionAuthentication), поэтому каждый
 * fetch-мутатор должен слать токен. Делаем это в одном месте через обёртку
 * window.fetch — не трогая ~25 компонентов по отдельности.
 *
 * GET/HEAD/OPTIONS и запросы к не-/api/ путям (RSC-навигация Next.js, ассеты)
 * не трогаем. Анонимные мутации (login/register) CSRF не требуют.
 */
const SAFE = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function CsrfFetch() {
  useEffect(() => {
    if ((window as any).__csrfFetchPatched) return;
    const orig = window.fetch.bind(window);
    (window as any).__csrfFetchPatched = true;

    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.pathname
            : (input as Request).url;
        const method = (init.method || "GET").toUpperCase();
        const isApi = url.startsWith("/api/") || url.includes("/api/v1/");
        if (isApi && !SAFE.has(method)) {
          const token = getCookie("csrftoken");
          if (token) {
            const headers = new Headers(init.headers || {});
            if (!headers.has("X-CSRFToken")) headers.set("X-CSRFToken", token);
            init = { ...init, headers };
          }
        }
      } catch {
        /* fail-open: при любой ошибке шлём запрос как есть */
      }
      return orig(input, init);
    };

    return () => {
      window.fetch = orig;
      (window as any).__csrfFetchPatched = false;
    };
  }, []);

  return null;
}
