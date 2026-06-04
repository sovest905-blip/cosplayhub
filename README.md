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

## Безопасность (вшито в архитектуру)
- Веб: авторизация через HttpOnly + SameSite cookie (JS не видит токен)
- Mobile (позже): JWT в защищённом хранилище ОС (Keychain/Keystore)
- Пароли: Argon2id
- Rate-limit на login/register/password-reset
- БД и Redis слушают только localhost
- Секреты только в .env (не в git)
- Все персональные данные — на серверах в РК (закон о перс. данных)
