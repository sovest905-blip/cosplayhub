"""Корневой роутер. Всё под /api/v1/."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common.views import StatsView, SearchView
from common.admin_panel import (
    AdminUsersView, AdminUserRolesView, AdminUserPasswordView,
    AdminUserSubsView, AdminUserSubDeleteView, AdminUserStaffView,
    AdminUserActiveView, AdminUserDeleteView,
)
from common.admin_content import (
    AdminStatsView, AdminWorkshopsView, AdminWorkshopDeleteView,
    AdminUserWorkshopsView, AdminWorkshopUpdateView,
    AdminListingsView, AdminListingActiveView, AdminListingDeleteView,
    AdminOrdersView, AdminOrderStatusView,
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
    path("admin-panel/users/<int:pk>/set-staff/", AdminUserStaffView.as_view(), name="ap-staff"),
    path("admin-panel/users/<int:pk>/set-active/", AdminUserActiveView.as_view(), name="ap-active"),
    path("admin-panel/users/<int:pk>/delete/", AdminUserDeleteView.as_view(), name="ap-delete"),
    path("admin-panel/users/<int:pk>/reset-password/", AdminUserPasswordView.as_view(), name="ap-pass"),
    path("admin-panel/users/<int:pk>/subscriptions/", AdminUserSubsView.as_view(), name="ap-subs"),
    path("admin-panel/users/<int:pk>/subscriptions/<int:target_id>/", AdminUserSubDeleteView.as_view(), name="ap-sub-del"),
    path("admin-panel/stats/", AdminStatsView.as_view(), name="ap-stats"),
    path("admin-panel/workshops/", AdminWorkshopsView.as_view(), name="ap-workshops"),
    path("admin-panel/workshops/<int:pk>/delete/", AdminWorkshopDeleteView.as_view(), name="ap-ws-del"),
    path("admin-panel/workshops/<int:pk>/", AdminWorkshopUpdateView.as_view(), name="ap-ws-update"),
    path("admin-panel/users/<int:pk>/workshops/", AdminUserWorkshopsView.as_view(), name="ap-user-ws"),
    path("admin-panel/listings/", AdminListingsView.as_view(), name="ap-listings"),
    path("admin-panel/listings/<int:pk>/set-active/", AdminListingActiveView.as_view(), name="ap-listing-active"),
    path("admin-panel/listings/<int:pk>/delete/", AdminListingDeleteView.as_view(), name="ap-listing-del"),
    path("admin-panel/orders/", AdminOrdersView.as_view(), name="ap-orders"),
    path("admin-panel/orders/<int:pk>/set-status/", AdminOrderStatusView.as_view(), name="ap-order-status"),
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
