# КосплейХаб СНГ — монорепо

Экосистема для косплея в Казахстане и СНГ.
Архитектура: API-first. Один бэкенд (Django REST), несколько клиентов (web сейчас, mobile позже).

## Структура
```
backend/   Django + DRF + PostgreSQL + Redis  — API (/api/v1/)
web/       Next.js (React + TypeScript)        — веб-клиент
shared/    Типы и API-клиент                    — общий код web ↔ mobile
mobile/    React Native (Expo)                  — ДОБАВИТСЯ ПОЗЖЕ
```

## Очерёдность разработки
Делаем по сущностям: **User → Profile → Workshop → Order**.
Платежи (эскроу, подписки) — ЗАГЛУШКИ до регистрации ТОО.

## Запуск бэкенда (нужен Docker)
```bash
cd backend
cp .env.example .env        # заполнить секреты
docker compose up --build
# API: http://localhost:8000/api/v1/
# Админка: http://localhost:8000/admin/
# Документация API: http://localhost:8000/api/v1/docs/
```

## Запуск веба
```bash
cd web
npm install
npm run dev                 # http://localhost:3000
```

## Поток разработки и деплой (CI/CD)

Прод обновляется **только через merge в `main`** — напрямую в `main` не коммитим.

```
feature-ветка ──PR──> main ──(merge)──> авто-деплой на VPS
        │                │
        │                └─ CI-гейты: web (типы+билд) + backend (Django check,
        │                   проверка миграций, pytest на Postgres)
        └─ ветка dev: push гоняет те же гейты БЕЗ деплоя (валидация перед PR)
```

- **`main`** — продакшн (`cosplayhub.kz`). Push сюда → гейты → деплой по SSH.
- **`dev`** — интеграционная/staging-ветка кода: push гоняет тесты, но НЕ деплоит.
- **PR в `main`** — гоняет гейты; мержить только когда зелёные.
- Деплой ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) гейтится
  `if: push && ref==main` — на PR и на `dev` job `deploy` пропускается.

Типичный цикл:
```bash
git checkout dev && git pull
git checkout -b feature/xxx
# …правки…
git push -u origin feature/xxx          # CI прогонит тесты
gh pr create --base main                # PR → гейты → review
# после merge в main — авто-деплой
```

> **Миграции пишутся вручную.** Изменил модель — создай миграцию
> (`makemigrations`), иначе шаг `makemigrations --check` уронит CI до деплоя.

> **Деплой и nginx.** `docker compose up --build` пересоздаёт web/frontend с новыми
> IP в docker-сети; nginx кэширует старый IP и отдаёт 502. В деплой-скрипте после
> билда стоит `docker compose restart nginx` — он перечитывает адреса. Не убирать.

## Безопасность (вшито в архитектуру)
- Веб: авторизация через HttpOnly + SameSite cookie (JS не видит токен)
- Mobile (позже): JWT в защищённом хранилище ОС (Keychain/Keystore)
- Пароли: Argon2id
- Rate-limit на login/register/password-reset
- БД и Redis слушают только localhost
- Секреты только в .env (не в git)
- Все персональные данные — на серверах в РК (закон о перс. данных)
