"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form className="nav-search" onSubmit={submit}>
      <input
        placeholder="Поиск..."
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Поиск"
      />
    </form>
  );
}
