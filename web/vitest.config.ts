import { defineConfig } from "vitest/config";

// Юнит-тесты чистых функций (без DOM). node-окружение достаточно.
// .next исключаем явно — vitest по умолчанию его не игнорирует.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".next", "dist"],
  },
});
