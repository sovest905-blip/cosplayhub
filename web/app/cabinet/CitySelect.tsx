// Селект города с поддержкой «Другой» → текстовое поле для ручного ввода.
// Вынесен из page.tsx (god-компонент) — используется в нескольких вкладках кабинета.
// value — реальное название города (для «Другой» хранится введённый текст, а не слово «Другой»).
"use client";
import { useState, useEffect } from "react";

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Бишкек", "Ташкент", "Москва", "Другой"];

export default function CitySelect({ value, onChange, emptyLabel = "Не выбран" }: {
  value: string; onChange: (v: string) => void; emptyLabel?: string;
}) {
  const [other, setOther] = useState(!!value && !CITIES.includes(value));
  // город подгрузился извне и его нет в списке → включаем ручной ввод
  useEffect(() => { if (value && !CITIES.includes(value)) setOther(true); }, [value]);
  return (
    <>
      <select
        value={other ? "Другой" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "Другой") { setOther(true); onChange(""); }
          else { setOther(false); onChange(v); }
        }}
      >
        <option value="">{emptyLabel}</option>
        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {other && (
        <input style={{ marginTop: 8 }} value={value} placeholder="Введите название города"
          onChange={(e) => onChange(e.target.value)} />
      )}
    </>
  );
}
