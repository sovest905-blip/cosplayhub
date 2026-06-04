# Карта проекта — где что лежит

## Бэкенд (Django REST API)
```
backend/
├── config/
│   ├── settings/base.py     ← общие настройки + ИБ (Argon2, DRF, throttling)
│   ├── settings/dev.py      ← разработка (CORS на localhost)
│   ├── settings/prod.py     ← прод (HTTPS, HSTS, Secure cookie)
│   └── urls.py              ← роутер: всё под /api/v1/
├── apps/
│   ├── users/               ← User (логин по email), регистрация, login/logout/me
│   ├── profiles/            ← Profile + SocialLink, каталог косплееров
│   ├── workshops/           ← Workshop + Service, каталог мастерских
│   └── orders/              ← Order (заявка через эскроу-статус, БЕЗ денег)
├── common/                  ← пагинация, права (IsOwnerOrReadOnly)
├── nginx/default.conf       ← reverse-proxy + заголовки безопасности
├── docker-compose.yml       ← db + redis + web + nginx (одна команда)
└── .env.example             ← шаблон секретов (.env в git НЕ идёт)
```

## Эндпоинты API v1 (готовые)
```
POST   /api/v1/auth/register/      регистрация
POST   /api/v1/auth/login/         вход (cookie-сессия, rate-limit 10/мин)
POST   /api/v1/auth/logout/        выход
GET    /api/v1/auth/me/            текущий пользователь
PATCH  /api/v1/auth/me/            обновить себя

GET    /api/v1/profiles/           каталог косплееров (фильтр available_for_work)
GET    /api/v1/profiles/{id}/      профиль
POST   /api/v1/profiles/           создать (только свой)

GET    /api/v1/workshops/          каталог мастерских (фильтр type, city, is_pro)
GET    /api/v1/workshops/{id}/     мастерская + услуги
POST   /api/v1/workshops/          создать

GET    /api/v1/orders/             МОИ заказы (чужие не видны — ИБ)
POST   /api/v1/orders/             создать заявку

GET    /api/v1/docs/               Swagger-документация
GET    /admin/                     админка Django
```

## Веб (Next.js)
```
web/app/
├── layout.tsx               ← каркас (nav)
├── page.tsx                 ← / главная
├── people/page.tsx          ← /people каталог (тянет API на сервере)
├── people/[id]/page.tsx     ← /people/3 профиль
├── workshops/page.tsx       ← /workshops каталог
└── workshops/[id]/page.tsx  ← /workshops/1 детальная
```

## Общий код (web ↔ mobile)
```
shared/
├── types/                   ← TypeScript-типы (User, Profile, Workshop, Order)
└── api/client.ts            ← единый API-клиент (cookie + CSRF)
```

## Что дальше (по очереди)
1. Запустить, создать суперюзера, проверить админку и Swagger
2. Заполнить тестовые данные через админку
3. Добавить регистрацию/логин на вебе (форма → /auth/login/)
4. Перенести остальные сущности: looks, listings, teams, events, locations
5. Когда веб работает — mobile/ на React Native (Expo), импортит shared/
6. Платежи — только после регистрации ТОО
