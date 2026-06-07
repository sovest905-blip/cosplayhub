"""Демо-данные для беты: профили с ролями/анкетами, мастерские с услугами,
магазины, локации, объявления, новости. Идемпотентна (get_or_create по username/имени).

Запуск на VPS:  docker compose exec web python manage.py seed_demo
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.events.models import Event
from apps.guides.models import Guide
from apps.listings.models import Listing
from apps.looks.models import Look
from apps.news.models import News
from apps.profiles.models import Profile
from apps.workshops.models import Service, Workshop

User = get_user_model()
PWD = "Demo2026!"

# ── Профили (юзер + Profile.role_details) ──
PROFILES = [
    {
        "username": "yuki_cos", "email": "yuki@demo.kz", "city": "Алматы",
        "roles": ["cosplayer", "fan"], "experience": "4 года", "available": True,
        "bio": "Косплею с 2021. Люблю детальные доспехи и киберпанк-образы. Открыта к коллабам.",
        "details": {
            "cosplayer": {"amplua": ["Косплеер", "Мейкер"], "fandoms": "Genshin Impact, Honkai, Cyberpunk",
                          "level": "Профи", "open_collab": True},
            "fan": {"fandoms": "Genshin, Arcane", "hobbies": ["Аниме", "Игры", "Рисование"]},
        },
    },
    {
        "username": "rin_kz", "email": "rin@demo.kz", "city": "Астана",
        "roles": ["cosplayer"], "experience": "2 года", "available": True,
        "bio": "Аниме-косплей и грим. Делаю образы под фотосеты.",
        "details": {"cosplayer": {"amplua": ["Косплеер", "Гримёр"], "fandoms": "Naruto, Jujutsu Kaisen",
                                  "level": "Продвинутый", "open_collab": True}},
    },
    {
        "username": "darkmage", "email": "darkmage@demo.kz", "city": "Шымкент",
        "roles": ["cosplayer"], "experience": "5 лет", "available": False,
        "bio": "Фэнтези и тёмные образы. Реквизит ручной работы.",
        "details": {"cosplayer": {"amplua": ["Косплеер", "Реквизитор"], "fandoms": "Witcher, Diablo, Warcraft",
                                  "level": "Профи", "open_collab": False}},
    },
    {
        "username": "akira_lens", "email": "akira@demo.kz", "city": "Алматы",
        "roles": ["photographer"], "experience": "6 лет", "available": True,
        "bio": "Фотограф косплея и портретов. Студия и выезд.",
        "details": {"photographer": {"shoot_types": ["Студийная", "Выездная", "Конвеншн"], "price_hour": 12000,
                                     "gear": "Sony A7 IV, выездной свет Godox", "portfolio_url": "https://example.com/akira"}},
    },
    {
        "username": "nightframe", "email": "night@demo.kz", "city": "Астана",
        "roles": ["photographer"], "experience": "3 года", "available": True,
        "bio": "Атмосферные кадры, ночные и неоновые съёмки.",
        "details": {"photographer": {"shoot_types": ["Выездная", "Предметная"], "price_hour": 9000,
                                     "gear": "Canon R6, дым-машина", "portfolio_url": "https://example.com/nightframe"}},
    },
    {
        "username": "cosshop_kz", "email": "shop@demo.kz", "city": "Алматы",
        "roles": ["shop"], "experience": "", "available": False,
        "bio": "Всё для косплея: линзы, парики, ткани, фурнитура. Доставка по СНГ.",
        "details": {"shop": {"shop_name": "CosShop KZ", "sells": "Линзы, парики, ткани, EVA, фурнитура",
                            "contact": "@cosshop_kz", "delivery_cis": True}},
    },
    {
        "username": "lens_store", "email": "lens@demo.kz", "city": "Караганда",
        "roles": ["shop"], "experience": "", "available": False,
        "bio": "Цветные линзы и аксессуары для образов.",
        "details": {"shop": {"shop_name": "Lens Store", "sells": "Цветные линзы, аксессуары",
                            "contact": "https://example.com/lens", "delivery_cis": True}},
    },
    {
        "username": "studio_neon", "email": "neon@demo.kz", "city": "Алматы",
        "roles": ["location"], "experience": "", "available": True,
        "bio": "Фотостудия с неоновыми зонами и циклорамой. Аренда по часам.",
        "details": {"location": {"loc_type": "Фотостудия", "price_hour": 8000, "capacity": "120 м², до 12 человек",
                                "amenities": "Свет, фоны, гримёрка, парковка", "loc_instagram": "@studio_neon",
                                "loc_tiktok": "@studio_neon", "loc_whatsapp": "+7 700 111 22 33",
                                "loc_site": "https://example.com/neon"}},
    },
    {
        "username": "loft21", "email": "loft@demo.kz", "city": "Астана",
        "roles": ["location"], "experience": "", "available": True,
        "bio": "Лофт-пространство с панорамными окнами под съёмки.",
        "details": {"location": {"loc_type": "Интерьер", "price_hour": 6000, "capacity": "80 м², до 8 человек",
                                "amenities": "Естественный свет, мебель, кухня", "loc_instagram": "@loft21",
                                "loc_whatsapp": "+7 701 222 33 44", "loc_site": "https://example.com/loft21"}},
    },
    {
        "username": "mangafan", "email": "fan@demo.kz", "city": "Караганда",
        "roles": ["fan"], "experience": "", "available": False,
        "bio": "Просто люблю аниме и мангу, хожу на сходки.",
        "details": {"fan": {"fandoms": "One Piece, Chainsaw Man", "hobbies": ["Аниме", "Манга", "Настолки", "K-pop"]}},
    },
]

# ── Мастерские (owner по username) ──
WORKSHOPS = [
    {"owner": "evaforge", "name": "EVA Forge", "type": "eva", "city": "Алматы",
     "about": "Доспехи и реквизит из EVA. Покраска, патина, сборка.", "eta": "7-14 дней",
     "services": [("Шлем", "Полный шлем с покраской", 15000), ("Нагрудник", "EVA-броня торса", 25000),
                  ("Меч/реквизит", "Бутафория под образ", 9000)]},
    {"owner": "evaforge", "name": "Print Lab 3D", "type": "print3d", "city": "Алматы",
     "about": "3D-печать деталей, постобработка, грунт.", "eta": "5-10 дней",
     "services": [("Деталь до 10см", "Печать + зачистка", 3500), ("Маска", "Печать составной маски", 18000)]},
    {"owner": "sewmaster", "name": "Atelier Cos", "type": "sewing", "city": "Астана",
     "about": "Пошив костюмов любой сложности по референсам.", "eta": "10-21 день",
     "services": [("Костюм базовый", "Пошив по выкройке", 30000), ("Платье сложное", "С декором и подкладом", 60000)]},
    {"owner": "wigmaster", "name": "WigCraft", "type": "wigs", "city": "Шымкент",
     "about": "Стайлинг и укладка париков под персонажа.", "eta": "3-7 дней",
     "services": [("Стайлинг парика", "Укладка + фиксация", 8000), ("Сложная причёска", "Шипы/объём/окрас", 20000)]},
]

# Владельцы мастерских — отдельные юзеры (роль workshop)
WS_OWNERS = [
    {"username": "evaforge", "email": "eva@demo.kz", "city": "Алматы"},
    {"username": "sewmaster", "email": "sew@demo.kz", "city": "Астана"},
    {"username": "wigmaster", "email": "wig@demo.kz", "city": "Шымкент"},
]

LISTINGS = [
    {"owner": "yuki_cos", "title": "Ищу фотографа для съёмки Genshin в Алматы", "type": "job",
     "city": "Алматы", "price": None, "description": "Нужен выездной фотограф на лок в горах, выходные."},
    {"owner": "rin_kz", "title": "Коллаб: ищу косплеера на парную работу JJK", "type": "collab",
     "city": "Астана", "price": None, "description": "Делаю Годжо, ищу Сукуну/Юдзи."},
    {"owner": "darkmage", "title": "Продаю доспех Ведьмака (EVA), размер M", "type": "sell",
     "city": "Шымкент", "price": 45000, "description": "Носил пару раз, состояние отличное."},
    {"owner": "mangafan", "title": "Куплю парик белый длинный", "type": "buy",
     "city": "Караганда", "price": 8000, "description": "Под Гето/Гэндзи, натуральный блонд."},
]

NEWS = [
    {"title": "Открыта закрытая бета КосплейХаб СНГ!", "pinned": True,
     "body": "Мы запустили бету для косплей-сообщества Казахстана и СНГ. Заполняйте профили, добавляйте роли и услуги."},
    {"title": "Новый раздел «Локации» с фотогалереей", "pinned": False,
     "body": "Фотостудии и площадки теперь могут показать себя: до 20 фото, соцсети и условия аренды."},
    {"title": "Портфолио для фотографов", "pinned": False,
     "body": "Фотографы могут загрузить до 15 работ прямо в анкету роли."},
]


class Command(BaseCommand):
    help = "Заполняет БД демо-данными (профили, мастерские, магазины, локации, объявления, новости)."

    def _user(self, username, email, city):
        u, created = User.objects.get_or_create(
            username=username, defaults={"email": email, "city": city, "is_email_verified": True},
        )
        if created:
            u.set_password(PWD)
            u.is_email_verified = True
            u.city = city
            if not u.email:
                u.email = email
            u.save()
        return u

    def handle(self, *args, **opts):
        n_prof = n_ws = n_list = n_news = n_ev = n_guide = n_look = 0
        today = timezone.localdate()

        # Профили
        for p in PROFILES:
            u = self._user(p["username"], p["email"], p["city"])
            prof, _ = Profile.objects.get_or_create(user=u, defaults={"display_name": u.username})
            prof.display_name = u.username
            prof.bio = p["bio"]
            prof.experience = p.get("experience", "")
            prof.roles = p["roles"]
            prof.available_for_work = p.get("available", False)
            prof.role_details = p.get("details", {})
            prof.save()
            n_prof += 1

        # Владельцы мастерских
        for o in WS_OWNERS:
            u = self._user(o["username"], o["email"], o["city"])
            prof, _ = Profile.objects.get_or_create(user=u, defaults={"display_name": u.username})
            if "workshop" not in (prof.roles or []):
                prof.roles = list(set((prof.roles or []) + ["workshop"]))
                prof.save()

        # Мастерские + услуги
        for w in WORKSHOPS:
            owner = User.objects.filter(username=w["owner"]).first()
            if not owner:
                continue
            ws, created = Workshop.objects.get_or_create(
                owner=owner, name=w["name"],
                defaults={"type": w["type"], "city": w["city"], "about": w["about"], "eta": w["eta"]},
            )
            if created:
                for name, desc, price in w["services"]:
                    Service.objects.create(workshop=ws, name=name, description=desc, price_from=price)
                n_ws += 1

        # Объявления
        for l in LISTINGS:
            owner = User.objects.filter(username=l["owner"]).first()
            if not owner:
                continue
            _, created = Listing.objects.get_or_create(
                user=owner, title=l["title"],
                defaults={"type": l["type"], "city": l["city"], "price": l["price"],
                          "description": l["description"], "is_active": True},
            )
            if created:
                n_list += 1

        # Новости
        admin = User.objects.filter(is_staff=True).first()
        for nw in NEWS:
            _, created = News.objects.get_or_create(
                title=nw["title"],
                defaults={"body": nw["body"], "is_pinned": nw["pinned"], "is_published": True, "author": admin},
            )
            if created:
                n_news += 1

        # События (будущие даты)
        events = [
            {"title": "Edgerunners фотосет — Алматы", "city": "Алматы", "place": "Парк Первого Президента",
             "days": 7, "going": 23, "desc": "Неоновый киберпанк-сет, берём дым и свет."},
            {"title": "AniFest Astana 2026", "city": "Астана", "place": "EXPO, павильон C",
             "days": 21, "going": 140, "desc": "Большой косплей-фестиваль: сцена, маркет, гости."},
            {"title": "Сходка Genshin — Шымкент", "city": "Шымкент", "place": "Центральный парк",
             "days": 14, "going": 38, "desc": "Тематическая сходка фанатов Genshin Impact."},
            {"title": "EVA-воркшоп: основы брони", "city": "Алматы", "place": "EVA Forge studio",
             "days": 10, "going": 12, "desc": "Мастер-класс по EVA: выкройки, термоформовка, покраска."},
        ]
        for ev in events:
            _, created = Event.objects.get_or_create(
                title=ev["title"],
                defaults={"city": ev["city"], "place": ev["place"], "going": ev["going"],
                          "description": ev["desc"], "date": today + timedelta(days=ev["days"]),
                          "is_published": True},
            )
            if created:
                n_ev += 1

        # Гайды
        guides = [
            {"title": "Термоформовка EVA: основы", "cat": "EVA",
             "summary": "Как гнуть EVA феном и строить объёмные детали брони.",
             "body": "Разогрев, формовка по болванке, фиксация формы, типичные ошибки новичков."},
            {"title": "Стайлинг парика под персонажа", "cat": "Парики",
             "summary": "Подбор, мытьё, укладка и фиксация причёски.",
             "body": "Виды волокна, термоустойчивость, лак и пудра, крепёж шипов и хвостов."},
            {"title": "Косплей-грим: контуринг и шрамы", "cat": "Грим",
             "summary": "База, контуринг лица и накладные элементы.",
             "body": "Праймер, тон, контур, латекс/желатин для шрамов, закрепление."},
            {"title": "3D-печать реквизита: от STL до покраски", "cat": "3D-печать",
             "summary": "Печать, постобработка и грунтовка деталей.",
             "body": "Слайсинг, поддержки, шпатлёвка швов, грунт, покраска и лак."},
        ]
        for g in guides:
            _, created = Guide.objects.get_or_create(
                title=g["title"], defaults={"category": g["cat"], "summary": g["summary"],
                                            "body": g["body"], "is_published": True},
            )
            if created:
                n_guide += 1

        # Образы (фото — плейсхолдер на фронте, без файлов)
        looks = [
            ("yuki_cos", "Райден Сёгун", "Genshin Impact"),
            ("yuki_cos", "Люси", "Cyberpunk: Edgerunners"),
            ("rin_kz", "Годжо Сатору", "Jujutsu Kaisen"),
            ("rin_kz", "Незуко", "Demon Slayer"),
            ("darkmage", "Геральт", "The Witcher"),
            ("darkmage", "Йеннифэр", "The Witcher"),
        ]
        for username, title, char in looks:
            author = User.objects.filter(username=username).first()
            if not author:
                continue
            _, created = Look.objects.get_or_create(
                author=author, title=title,
                defaults={"character": char, "is_published": True},
            )
            if created:
                n_look += 1

        self.stdout.write(self.style.SUCCESS(
            f"Готово: профилей {n_prof}, мастерских +{n_ws}, объявлений +{n_list}, новостей +{n_news}, "
            f"событий +{n_ev}, гайдов +{n_guide}, образов +{n_look}. Пароль всех демо: {PWD}"
        ))
