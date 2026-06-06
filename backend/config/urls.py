"""Корневой роутер. Всё под /api/v1/."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common.views import StatsView, SearchView
from common.admin_panel import (
    AdminUsersView, AdminUserRolesView, AdminUserPasswordView,
    AdminUserSubsView, AdminUserSubDeleteView,
)

api_v1 = [
    path("stats/", StatsView.as_view(), name="stats"),
    path("search/", SearchView.as_view(), name="search"),
    path("auth/", include("apps.users.urls")),
    path("", include("apps.profiles.urls")),
    path("", include("apps.workshops.urls")),
    path("", include("apps.orders.urls")),
    path("", include("apps.listings.urls")),
    path("", include("apps.messaging.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.news.urls")),
    # ── Веб админ-панель (только staff) ──
    path("admin-panel/users/", AdminUsersView.as_view(), name="ap-users"),
    path("admin-panel/users/<int:pk>/set-roles/", AdminUserRolesView.as_view(), name="ap-roles"),
    path("admin-panel/users/<int:pk>/reset-password/", AdminUserPasswordView.as_view(), name="ap-pass"),
    path("admin-panel/users/<int:pk>/subscriptions/", AdminUserSubsView.as_view(), name="ap-subs"),
    path("admin-panel/users/<int:pk>/subscriptions/<int:target_id>/", AdminUserSubDeleteView.as_view(), name="ap-sub-del"),
    # документация API
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
