import type { ReactNode } from "react";

/**
 * Безопасно превращает текст в React-узлы с кликабельными ссылками.
 * Поддерживает:
 *   • markdown-вид  [текст](https://…)  или  [текст](/people/1)
 *   • «голые» ссылки  https://…  и  www.…
 * HTML не вставляется (никакого dangerouslySetInnerHTML) — теги <a> строим сами,
 * поэтому XSS невозможен. Разрешены только http/https и внутренние пути «/…».
 */

const MD = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
const BARE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;

function safeHref(url: string): string | null {
  const u = url.trim();
  if (u.startsWith("/")) return u;                    // внутренний путь
  if (/^https?:\/\//i.test(u)) return u;              // http/https
  if (/^www\./i.test(u)) return `https://${u}`;       // www.… → https
  return null;                                        // всё прочее (js:, data:…) — не ссылка
}

function anchor(href: string, label: string, key: string): ReactNode {
  const internal = href.startsWith("/");
  return (
    <a
      key={key}
      href={href}
      {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      style={{ color: "var(--accent-2, #7cf9ff)", textDecoration: "underline" }}
    >
      {label}
    </a>
  );
}

/** «Голые» ссылки внутри куска текста (уже без markdown). */
function linkifyBare(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  BARE.lastIndex = 0;
  let i = 0;
  while ((m = BARE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const href = safeHref(m[0]);
    // хвостовую пунктуацию (точку/запятую/скобку) не втягиваем в ссылку
    const raw = m[0].replace(/[.,;:!?)]+$/, "");
    const trimmed = m[0].length - raw.length;
    out.push(href ? anchor(safeHref(raw) || raw, raw, `${keyBase}-b${i}`) : m[0]);
    if (trimmed) out.push(m[0].slice(raw.length));
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function linkify(text: string): ReactNode[] {
  if (!text) return [];
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MD.lastIndex = 0;
  let i = 0;
  while ((m = MD.exec(text))) {
    if (m.index > last) out.push(...linkifyBare(text.slice(last, m.index), `md${i}`));
    const href = safeHref(m[2]);
    out.push(href ? anchor(href, m[1], `md${i}`) : m[0]);
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(...linkifyBare(text.slice(last), "tail"));
  return out;
}

/** Готовый компонент: сохраняет переносы строк и делает ссылки кликабельными. */
export function RichText({ text, style }: { text: string; style?: React.CSSProperties }) {
  return <p style={{ whiteSpace: "pre-wrap", ...style }}>{linkify(text)}</p>;
}
