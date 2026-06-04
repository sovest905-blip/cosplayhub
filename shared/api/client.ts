// Единый API-клиент для web и mobile.
// ИБ: credentials:'include' — cookie (HttpOnly) ходят автоматически на вебе.
// На mobile этот же клиент переопределит заголовок Authorization (JWT из Keychain).

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  // CSRF-токен для изменяющих запросов
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = getCookie("csrftoken");
    if (csrf) headers["X-CSRFToken"] = csrf;
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",   // cookie HttpOnly
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Ошибка ${res.status}`);
  }
  return res.status === 204 ? (null as T) : res.json();
}

// Примеры методов (расширяются по мере роста API)
export const api = {
  profiles: {
    list: () => apiFetch<{ results: import("../types/profile").Profile[] }>("/profiles/"),
    get: (id: number) => apiFetch<import("../types/profile").Profile>(`/profiles/${id}/`),
  },
  workshops: {
    list: () => apiFetch<{ results: import("../types/workshop").Workshop[] }>("/workshops/"),
    get: (id: number) => apiFetch<import("../types/workshop").Workshop>(`/workshops/${id}/`),
  },
  orders: {
    create: (data: Partial<import("../types/order").Order>) =>
      apiFetch<import("../types/order").Order>("/orders/", {
        method: "POST", body: JSON.stringify(data),
      }),
  },
  auth: {
    login: (email: string, password: string) =>
      apiFetch<import("../types/user").User>("/auth/login/", {
        method: "POST", body: JSON.stringify({ email, password }),
      }),
    me: () => apiFetch<import("../types/user").User>("/auth/me/"),
  },
};
