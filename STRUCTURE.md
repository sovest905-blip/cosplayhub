# Карта проекта — где что лежит

> Актуализировано 2026-07-08. Монорепо (npm workspaces): `web` + `shared`, бэкенд отдельно в `backend`.
> Стек: Django 5 + DRF + PostgreSQL 17 + Redis (бэк), Next.js 16 + React 19 + TS (веб). Мобилка (Expo) — позже.

## Корень репо
```
cosplayhub/
├── backend/            ← Django REST API (+ docker-compose со всеми сервисами)
├── web/                ← Next.js (сайт)
├── shared/             ← общие TS-типы/клиент (легаси-минимум, см. ниже)
├── legal/              ← юр-документы (6 .md: Соглашение/Конфиденциальность/Оферта/Правила/Cookie/Согласие ПДн)
├── README.md · GETTING_STARTED.md · STRUCTURE.md
└── package.json        ← npm workspaces (web + shared)
```

## Бэкенд (backend/)
```
backend/
├── config/
│   ├── settings/base.py   ← общие настройки + ИБ (Argon2, DRF, throttling, EMAIL, платёжные токены)
│   ├── settings/dev.py    ← разработка (CORS на localhost, Secure-куки off)
│   ├── settings/prod.py   ← прод (fail-fast SECRET_KEY/ALLOWED_HOSTS, HSTS, Secure-куки по env, CSRF/CORS origins)
│   └── urls.py            ← роутер: всё под /api/v1/ (подключает urls каждого приложения + admin-panel)
├── apps/                  ← 20 Django-приложений (см. таблицу ниже)
├── common/               ← сквозное: stats, search, feed, analytics/me + вся admin-panel
│                            (admin_panel.py — юзеры/локации, admin_content.py — контент, admin_billing.py — Pro)
├── nginx/default.conf    ← внутренний reverse-proxy + заголовки безопасности (HSTS/CSP), rate-limit /admin
├── docker-compose.yml    ← db(pg17) + redis + web(Django) + frontend(Next) + nginx + mailhog + tgbot
└── .env.example          ← шаблон секретов (.env в git НЕ идёт)
```

### Приложения (apps/) — 20 шт.
| Приложение | Модели | Отвечает за |
|-----------|--------|-------------|
| `users` | User, Invite | Аутентификация (email/телефон/telegram), регистрация, login/logout/me, смена пароля/email, инвайты |
| `profiles` | Profile, SocialLink, Follow, Favorite, ProfilePhoto, ProfileView, RoleMedia | Профиль + роли (косплеер/фотограф/магазин/локация/фанат), каталоги, подписки, избранное, галерея, «кто смотрел», fan-matches |
| `workshops` | Workshop, Service, WorkshopPhoto, Review | Мастерские (3D-печать/EVA/пошив/парики), услуги, фото работ, отзывы |
| `billing` | Subscription | Единый Pro (активация, срок, приоритет в каталогах, гейт фишек) |
| `orders` | Order, Review | Заказы в мастерские (входящие/исходящие, статусы), отзыв по завершённому |
| `listings` | Listing | Барахолка (`/market`) и слоты/коллабы (`/jobs`) — одна модель, фильтр по типу |
| `messaging` | Conversation, Message | Личные сообщения (двухпанельный мессенджер, пуллинг) |
| `notifications` | Notification | Уведомления (сообщение/заказ/подписка/статус) |
| `news` | News | Лента новостей/анонсов (`/news`) |
| `events` | Event, EventAttendee | События (`/events`), кнопка «Пойду» |
| `guides` | Guide, GuidePhoto | Гайды (`/guides`), фото-маркеры `[фото:N]` в тексте |
| `looks` | Look, LookLike, LookUpdate | Образы (`/looks`), лайки, WIP-прогресс («Хочу скосплеить») |
| `teams` | Team, TeamMember, TeamLike | Команды (`/teams`), состав/заявки, портфолио из образов |
| `products` | Product | Витрина товаров магазина (`/products`), как Etsy |
| `bookings` | Slot, Booking | Слоты аренды локаций (`/people/[id]` секция), бронь-заявка |
| `shoots` | Shoot, ShootParticipant | «Собери команду на съёмку» (`/shoots`) — киллер-фича |
| `rentals` | Costume, RentalRequest | Прокат костюмов (`/rent`) |
| `battles` | Battle, BattleEntry, BattleVote | Косплей-баттлы/голосование (`/battles`) |
| `homepage` | — | Кураторская главная: «Выбор редакции» (curated) + категории (admin-panel/curated, /categories) |
| `analytics` | DailyVisit, VisitorDay | Счётчик посещений сайта (только staff), дедуп по IP/день |

> Деньги: все платёжные пути — крипто-шлюз Crypto Pay (@CryptoBot), токены в `.env`. Реальные фиат-платежи и Pro-группа B — после ТОО.

## Эндпоинты API v1 (обзор; полная схема — Swagger `/api/v1/docs/`, только staff)
```
auth/       register login logout me send-otp verify-otp forgot/reset-password
            send-telegram-otp verify-telegram-otp avatar cover change-password/email delete-account
profiles/   каталоги, {id}, follow, favorites, me/photos, me/viewers, fan-matches, by-slug, me/role-media, me/media-kit
workshops/  каталог, {id}, mine, photos, reviews
billing/    activate, me                          orders/     мои, incoming, {id} статус, review
listings/   свои CRUD + public/                   products/   каталог, {id}, mine, owner
looks/      каталог, {id}, like, updates          teams/      каталог, {id}, join/leave/like, members
events/     каталог, {id}, attend, mine           guides/     каталог, {id}, photos
news/       лента                                 conversations/ + messages/ + notifications/
slots/ bookings/ (bookings)   shoots/ + shoots/mine/   costumes/ rentals/   battles/ + entry/vote
stats/  search/?q=  feed/  analytics/me/           admin-panel/... (весь staff-контроль, IsAdminUser)
docs/ (Swagger, staff)   /admin/ (Django-админка)
```

## Веб (web/)
```
web/app/
├── layout.tsx          ← каркас: шапка (AuthNav), меню-дропы, футер
├── page.tsx            ← / главная (hero-статы, косплееры/мастерские/магазины, новости+события)
├── auth/               ← login · register · verify-email · forgot-password
├── cabinet/            ← личный кабинет (SPA-табы ?tab=): профиль/роли/анкеты/объявления/отклики/
│                          подписки/избранное/соцсети/аналитика/съёмки/прокат/настройки  ⚠ god-компонент (~2800 строк)
├── admin-panel/        ← кастомная админка (is_staff): дашборд + все разделы  ⚠ god-компонент (~1970 строк)
├── people/ · people/[id]/   ← каталог косплееров/фотографов + профиль (роль-контекст ?role=)
├── workshops/ shops/ locations/ photographers/  ← каталоги ролей
├── looks/ teams/ shoots/ rent/ battles/         ← комьюнити-разделы (+ /new формы)
├── events/ news/ guides/ market/ jobs/ products/ ← контент/витрины
├── pro/ · u/[slug]/    ← лендинг Pro · кастомный URL профиля
├── feed/ search/ messages/ notifications/       ← лента · поиск · мессенджер · уведомления
├── legal/              ← живые страницы юр-документов
├── components/         ← ~26 клиентских компонентов (кнопки-гейты, панели, трекеры — см. ниже)
└── lib/
    ├── api.ts          ← ЕДИНЫЙ API-клиент + все актуальные TS-типы (основной источник типов, не shared/)
    ├── roleForms.tsx   ← ROLE_FORMS + RoleFields (общие для кабинета и админки — не дублировать)
    └── mock.ts         ← мок-фолбэк только для кураторских секций главной
```
Ключевые компоненты (`web/app/components/`): AuthNav, MobileMenu, GatedButton/OwnerOnly (гейты действий),
CsrfFetch (обёртка fetch с X-CSRFToken), Follow/Save/Like/Going/Order/Message-кнопки, MessagesPanel,
CryptoPayButton/DonateButton/SiteDonate (крипто-оплата), VisitTracker/ProfileViewTracker, EmptyState/ComingSoon.

## Общий код (shared/) — легаси-минимум
```
shared/
├── types/   ← только user/profile/workshop/order (устарело, покрывает мало)
└── api/client.ts
```
⚠ Актуальные типы и API-клиент фронта живут в `web/lib/api.ts`, а НЕ в `shared/`. `shared/` задумывался под
переиспользование с будущей мобилкой (Expo) — пока почти пустой.

## Инфраструктура / деплой
- Прод: VPS + Plesk(443) → Apache → docker `127.0.0.1:8080` (nginx) → Django(web:8000) / Next(frontend:3000).
- CI/CD: push в `main` → GitHub Actions (typecheck+build / django check+миграции / pytest на Postgres) → деплой.
- Тесты: бэк — ~30 тест-файлов почти на все приложения (`apps/*/tests/`); фронт — тестов пока нет (тех-долг).
- Детали окружения, доступы и грабли деплоя — вне репо (в приватных заметках), не в этом файле.
