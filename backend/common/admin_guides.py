"""Админ-панель: модерация гайдов (только staff) — очередь на проверку,
одобрить/отклонить (с причиной). Автор получает уведомление о решении."""
from django.db.models import Q
from rest_framework.response import Response

from common.admin_panel import _StaffView
from apps.guides.models import Guide

GUIDE_STATUS_RU = dict(Guide.STATUS_CHOICES)


def _notify(user, text, url):
    if not user:
        return
    from apps.notifications.models import notify
    notify(user, "system", text, url)


def _guide_row(g):
    return {
        "id": g.id,
        "title": g.title,
        "summary": g.summary,
        "body": g.body,
        "category": g.category,
        "cover": g.cover.url if g.cover else None,
        "photos": [{"id": p.id, "url": p.image.url} for p in g.photos.all()],
        "status": g.status,
        "status_display": GUIDE_STATUS_RU.get(g.status, g.status),
        "moderation_note": g.moderation_note,
        "author": g.author.username if g.author else "",
        "author_id": g.author_id,
        "created_at": g.created_at,
    }


class AdminGuidesView(_StaffView):
    """GET — все гайды (?status=pending|published|rejected, ?q=)."""

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        status_f = (request.query_params.get("status") or "").strip()
        qs = Guide.objects.select_related("author").prefetch_related("photos").order_by("-created_at")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(summary__icontains=q)
                           | Q(category__icontains=q) | Q(author__username__icontains=q))
        if status_f in GUIDE_STATUS_RU:
            qs = qs.filter(status=status_f)
        return Response([_guide_row(g) for g in qs[:150]])


class AdminGuideModerateView(_StaffView):
    """POST {action: approve|reject, note?} — решение по гайду + уведомление автору."""

    def post(self, request, pk):
        g = Guide.objects.filter(pk=pk).select_related("author").first()
        if not g:
            return Response({"detail": "Не найдено"}, status=404)
        action = request.data.get("action")
        url = f"/guides/{g.id}"
        if action == "approve":
            g.status = "published"
            g.is_published = True
            g.moderation_note = ""
            g.save(update_fields=["status", "is_published", "moderation_note"])
            _notify(g.author, f"Гайд «{g.title}» одобрен и опубликован", url)
        elif action == "reject":
            g.status = "rejected"
            g.is_published = False
            g.moderation_note = str(request.data.get("note") or "")[:300]
            g.save(update_fields=["status", "is_published", "moderation_note"])
            note = f": {g.moderation_note}" if g.moderation_note else ""
            _notify(g.author, f"Гайд «{g.title}» отклонён{note}", url)
        else:
            return Response({"detail": "action: approve или reject"}, status=400)
        return Response(_guide_row(g))
