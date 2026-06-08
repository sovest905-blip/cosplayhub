"""Админ-панель: контент-разделы (только staff) — статистика, мастерские,
объявления, заказы. Управление юзерами/локациями — в common/admin_panel.py."""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response

from common.admin_panel import _StaffView
from apps.users.models import User
from apps.profiles.models import Profile, ProfilePhoto, gallery_limit
from apps.profiles.serializers import ProfilePhotoSerializer
from apps.workshops.models import Workshop
from apps.workshops.serializers import WorkshopSerializer
from apps.listings.models import Listing
from apps.orders.models import Order
from apps.news.models import News
from apps.events.models import Event
from apps.guides.models import Guide
from apps.looks.models import Look
from apps.teams.models import Team
from apps.moodboards.models import Moodboard

OPEN_ORDER_STATUSES = ["request", "accepted", "in_work"]


class AdminStatsView(_StaffView):
    """GET — сводка для дашборда."""

    def get(self, request):
        week_ago = timezone.now() - timedelta(days=7)
        return Response({
            "users_total": User.objects.filter(is_superuser=False).count(),
            "users_active": User.objects.filter(is_superuser=False, is_active=True).count(),
            "users_blocked": User.objects.filter(is_superuser=False, is_active=False).count(),
            "users_new_7d": User.objects.filter(is_superuser=False, created_at__gte=week_ago).count(),
            "workshops": Workshop.objects.count(),
            "locations": Profile.objects.filter(roles__contains=["location"]).count(),
            "listings_total": Listing.objects.count(),
            "listings_active": Listing.objects.filter(is_active=True).count(),
            "orders_total": Order.objects.count(),
            "orders_open": Order.objects.filter(status__in=OPEN_ORDER_STATUSES).count(),
            "news": News.objects.count(),
            "events": Event.objects.count(),
            "guides": Guide.objects.count(),
            "looks": Look.objects.count(),
            "teams": Team.objects.count(),
            "moodboards": Moodboard.objects.count(),
        })


class AdminWorkshopsView(_StaffView):
    """GET — список мастерских (поиск ?q=, ?type=)."""

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        wtype = (request.query_params.get("type") or "").strip()
        qs = Workshop.objects.select_related("owner").order_by("-id")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(city__icontains=q) | Q(owner__username__icontains=q))
        if wtype:
            qs = qs.filter(type=wtype)
        return Response([{
            "id": w.id,
            "name": w.name,
            "type": w.type,
            "city": w.city,
            "owner": w.owner.username if w.owner else "",
            "owner_id": w.owner_id,
            "is_pro": w.is_pro,
            "services": w.services.count(),
            "orders_count": w.orders_count,
            "cover": w.cover.url if w.cover else None,
            "created_at": w.created_at,
        } for w in qs[:100]])


class AdminWorkshopDeleteView(_StaffView):
    """DELETE — удалить мастерскую."""

    def delete(self, request, pk):
        w = Workshop.objects.filter(pk=pk).first()
        if not w:
            return Response({"detail": "Не найдено"}, status=404)
        w.delete()
        return Response(status=204)


class AdminUserWorkshopsView(_StaffView):
    """GET — мастерские конкретного юзера (с услугами). POST — создать мастерскую за юзера."""

    def get(self, request, pk):
        owner = User.objects.filter(pk=pk).first()
        if not owner:
            return Response({"detail": "Не найдено"}, status=404)
        qs = Workshop.objects.filter(owner=owner).prefetch_related("services").order_by("-created_at")
        return Response(WorkshopSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request, pk):
        owner = User.objects.filter(pk=pk).first()
        if not owner:
            return Response({"detail": "Не найдено"}, status=404)
        ser = WorkshopSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save(owner=owner)
        return Response(ser.data, status=201)


class AdminWorkshopUpdateView(_StaffView):
    """PATCH — обновить мастерскую (название/тип/город/срок/описание/услуги)."""

    def patch(self, request, pk):
        w = Workshop.objects.filter(pk=pk).first()
        if not w:
            return Response({"detail": "Не найдено"}, status=404)
        ser = WorkshopSerializer(w, data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class AdminListingsView(_StaffView):
    """GET — все объявления (поиск ?q=, ?type=, ?status=active|hidden)."""

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        ltype = (request.query_params.get("type") or "").strip()
        status_f = (request.query_params.get("status") or "").strip()
        qs = Listing.objects.select_related("user").order_by("-created_at")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(city__icontains=q) | Q(user__username__icontains=q))
        if ltype:
            qs = qs.filter(type=ltype)
        if status_f == "active":
            qs = qs.filter(is_active=True)
        elif status_f == "hidden":
            qs = qs.filter(is_active=False)
        return Response([{
            "id": l.id,
            "title": l.title,
            "type": l.type,
            "city": l.city,
            "price": l.price,
            "is_active": l.is_active,
            "owner": l.user.username if l.user else "",
            "owner_id": l.user_id,
            "created_at": l.created_at,
        } for l in qs[:150]])


class AdminListingActiveView(_StaffView):
    """POST {is_active} — скрыть/показать объявление."""

    def post(self, request, pk):
        l = Listing.objects.filter(pk=pk).first()
        if not l:
            return Response({"detail": "Не найдено"}, status=404)
        l.is_active = bool(request.data.get("is_active"))
        l.save(update_fields=["is_active"])
        return Response({"id": l.id, "is_active": l.is_active})


class AdminListingDeleteView(_StaffView):
    """DELETE — удалить объявление."""

    def delete(self, request, pk):
        l = Listing.objects.filter(pk=pk).first()
        if not l:
            return Response({"detail": "Не найдено"}, status=404)
        l.delete()
        return Response(status=204)


MAX_PHOTOS = 20


class AdminUserPhotosView(_StaffView):
    """GET — фото галереи юзера. POST — загрузить за юзера (multipart 'file', лимит 20)."""

    def _profile(self, pk):
        user = User.objects.filter(pk=pk, is_superuser=False).first()
        if not user:
            return None
        prof, _ = Profile.objects.get_or_create(
            user=user, defaults={"display_name": user.username or "user", "roles": ["fan"]},
        )
        return prof

    def get(self, request, pk):
        prof = self._profile(pk)
        if not prof:
            return Response({"detail": "Не найдено"}, status=404)
        return Response(ProfilePhotoSerializer(prof.photos.all(), many=True).data)

    def post(self, request, pk):
        prof = self._profile(pk)
        if not prof:
            return Response({"detail": "Не найдено"}, status=404)
        limit = gallery_limit(prof.roles)
        if limit == 0:
            return Response({"detail": "Галерея доступна для ролей «Локация» и «Фотограф»"}, status=400)
        if prof.photos.count() >= limit:
            return Response({"detail": f"Лимит {limit} фото"}, status=400)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Файл не передан"}, status=400)
        if not file.content_type.startswith("image/"):
            return Response({"detail": "Только изображения"}, status=400)
        if file.size > 5 * 1024 * 1024:
            return Response({"detail": "Максимум 5 МБ"}, status=400)
        photo = ProfilePhoto.objects.create(profile=prof, image=file)
        return Response(ProfilePhotoSerializer(photo).data, status=201)


class AdminUserPhotoDeleteView(_StaffView):
    """DELETE — удалить фото из галереи юзера."""

    def delete(self, request, pk, photo_id):
        photo = ProfilePhoto.objects.filter(pk=photo_id, profile__user_id=pk).first()
        if photo:
            photo.image.delete(save=False)
            photo.delete()
        return Response(status=204)


class AdminOrdersView(_StaffView):
    """GET — все заказы (фильтр ?status=, поиск ?q=)."""

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        status_f = (request.query_params.get("status") or "").strip()
        qs = Order.objects.select_related("customer", "workshop").order_by("-created_at")
        if q:
            qs = qs.filter(Q(workshop__name__icontains=q) | Q(customer__username__icontains=q) | Q(description__icontains=q))
        if status_f:
            qs = qs.filter(status=status_f)
        status_map = dict(Order.STATUS)
        return Response([{
            "id": o.id,
            "customer": o.customer.username if o.customer else "",
            "workshop": o.workshop.name if o.workshop else "",
            "description": o.description,
            "budget": o.budget,
            "status": o.status,
            "status_display": status_map.get(o.status, o.status),
            "created_at": o.created_at,
        } for o in qs[:150]])


class AdminOrderStatusView(_StaffView):
    """POST {status} — сменить статус заказа (разбор спорных)."""

    def post(self, request, pk):
        o = Order.objects.filter(pk=pk).first()
        if not o:
            return Response({"detail": "Не найдено"}, status=404)
        new_status = request.data.get("status")
        valid = {s for s, _ in Order.STATUS}
        if new_status not in valid:
            return Response({"detail": "Неверный статус"}, status=400)
        o.status = new_status
        o.save(update_fields=["status"])
        return Response({"id": o.id, "status": o.status})
