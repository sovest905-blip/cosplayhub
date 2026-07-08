import { describe, it, expect } from "vitest";
import { pl, fmtCount, fmtPrice, socialUrl, fmtDetailValue } from "./api";

describe("pl — русское склонение", () => {
  it("единственное число (1, 21)", () => {
    expect(pl(1, ["анкета", "анкеты", "анкет"])).toBe("1 анкета");
    expect(pl(21, ["анкета", "анкеты", "анкет"])).toBe("21 анкета");
  });
  it("форма 2–4 (3, 24)", () => {
    expect(pl(3, ["анкета", "анкеты", "анкет"])).toBe("3 анкеты");
    expect(pl(24, ["анкета", "анкеты", "анкет"])).toBe("24 анкеты");
  });
  it("множественное (5, 11, 100)", () => {
    expect(pl(5, ["анкета", "анкеты", "анкет"])).toBe("5 анкет");
    expect(pl(0, ["анкета", "анкеты", "анкет"])).toBe("0 анкет");
  });
  it("исключение teens (11–14 всегда мн.ч.)", () => {
    expect(pl(11, ["анкета", "анкеты", "анкет"])).toBe("11 анкет");
    expect(pl(112, ["анкета", "анкеты", "анкет"])).toBe("112 анкет");
  });
});

describe("fmtCount — компактный счётчик", () => {
  it("до 1000 — как есть", () => {
    expect(fmtCount(0)).toBe("0");
    expect(fmtCount(999)).toBe("999");
  });
  it("тысячи → k, без хвоста .0", () => {
    expect(fmtCount(1000)).toBe("1k");
    expect(fmtCount(1200)).toBe("1.2k");
    expect(fmtCount(15000)).toBe("15k");
  });
});

describe("fmtPrice — цена в тенге", () => {
  it("null → «Цена по запросу»", () => {
    expect(fmtPrice(null)).toBe("Цена по запросу");
  });
  it("число → локализованное + ₸ (устойчиво к разделителю)", () => {
    expect(fmtPrice(500)).toMatch(/^500\s?₸$/);
    expect(fmtPrice(1000)).toMatch(/^1\s?000\s?₸$/);
  });
});

describe("socialUrl — хэндл → ссылка", () => {
  it("готовый URL отдаётся как есть", () => {
    expect(socialUrl("instagram", "https://foo.bar/x")).toBe("https://foo.bar/x");
  });
  it("хэндл склеивается с базой, @ срезается", () => {
    expect(socialUrl("instagram", "@nick")).toBe("https://instagram.com/nick");
    expect(socialUrl("telegram", "nick")).toBe("https://t.me/nick");
  });
  it("платформа без базы (discord) → сам хэндл", () => {
    expect(socialUrl("discord", "user#1234")).toBe("user#1234");
    expect(socialUrl("unknown", "x")).toBe("x");
  });
});

describe("fmtDetailValue — значение анкеты в строку", () => {
  it("пусто → пустая строка", () => {
    expect(fmtDetailValue(null)).toBe("");
    expect(fmtDetailValue("")).toBe("");
    expect(fmtDetailValue(undefined)).toBe("");
  });
  it("boolean: true → «Да», false → пусто", () => {
    expect(fmtDetailValue(true)).toBe("Да");
    expect(fmtDetailValue(false)).toBe("");
  });
  it("массив → join, пустой массив → пусто", () => {
    expect(fmtDetailValue(["a", "b"])).toBe("a, b");
    expect(fmtDetailValue([])).toBe("");
  });
  it("значение + суффикс", () => {
    expect(fmtDetailValue(5000, " ₸/час")).toBe("5000 ₸/час");
  });
});
