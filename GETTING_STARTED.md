# Запуск за 5 минут

## 1. Положить в git
```bash
cd cosplayhub
git init && git add . && git commit -m "Скелет монорепо: backend + web + shared"
```

## 2. Поднять бэкенд (нужен Docker)
```bash
cd backend
cp .env.example .env
# открой .env, поставь случайные значения DJANGO_SECRET_KEY и POSTGRES_PASSWORD
docker compose up --build
```
Открой:
- http://localhost:8000/api/v1/docs/  — документация API
- http://localhost:8000/admin/         — админка

## 3. Создать админа (в другом терминале)
```bash
docker compose exec web python manage.py createsuperuser
```
Зайди в /admin, создай пару профилей и мастерскую для теста.

## 4. Поднять веб
```bash
cd ../web
cp .env.local.example .env.local
npm install
npm run dev
```
Открой http://localhost:3000 — каталоги потянут данные из API.

## Если что-то не работает
- API не отвечает → проверь `docker compose logs web`
- CORS-ошибка → проверь FRONTEND_ORIGIN в backend/.env
- Веб пустой → сначала создай данные в /admin
