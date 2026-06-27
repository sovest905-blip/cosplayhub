"""Корневой роутер. Всё под /api/v1/."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAdminUser

from common.views import StatsView, SearchView, AnalyticsMeView
from common.feed import FeedView
from common.admin_panel import (
    AdminUsersView, AdminUserRolesView, AdminUserPasswordView,
    AdminUserSubsView, AdminUserSubDeleteView, AdminUserStaffView,
    AdminUserActiveView, AdminUserDeleteView,
    AdminInvitesView, AdminInviteUpdateView,
)
from common.admin_content import (
    AdminStatsView, AdminWorkshopsView, AdminWorkshopDeleteView,
    AdminUserWorkshopsView, AdminWorkshopUpdateView,
    AdminListingsView, AdminListingActiveView, AdminListingUpdateView, AdminListingDeleteView,
    AdminProductsView, AdminProductActiveView, AdminProductDeleteView,
    AdminUserProductsView, AdminProductUpdateView,
    AdminUserSlotsView, AdminSlotUpdateView,
    AdminOrdersView, AdminOrderStatusView,
    AdminUserPhotosView, AdminUserPhotoDeleteView,
)
from common.admin_billing import AdminSubscriptionsView, AdminSubscriptionUpdateView

api_v1 = [
    path("stats/", StatsView.as_view(), name="stats"),
    path("search/", SearchView.as_view(), name="search"),
    path("analytics/me/", AnalyticsMeView.as_view(), name="analytics-me"),
    path("feed/", FeedView.as_view(), name="feed"),
    path("auth/", include("apps.users.urls")),
    path("", include("apps.profiles.urls")),
    path("", include("apps.workshops.urls")),
    path("", include("apps.billing.urls")),
    path("", include("apps.orders.urls")),
    path("", include("apps.listings.urls")),
    path("", include("apps.messaging.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.news.urls")),
    path("", include("apps.events.urls")),
    path("", include("apps.guides.urls")),
    path("", include("apps.looks.urls")),
    path("", include("apps.teams.urls")),
    path("", include("apps.products.urls")),
    path("", include("apps.bookings.urls")),
    path("", include("apps.shoots.urls")),
    path("", include("apps.rentals.urls")),
    # ── Веб админ-панель (только staff) ──
    path("admin-panel/users/", AdminUsersView.as_view(), name="ap-users"),
    path("admin-panel/users/<int:pk>/set-roles/", AdminUserRolesView.as_view(), name="ap-roles"),
    path("admin-panel/users/<int:pk>/set-staff/", AdminUserStaffView.as_view(), name="ap-staff"),
    path("admin-panel/users/<int:pk>/set-active/", AdminUserActiveView.as_view(), name="ap-active"),
    path("admin-panel/users/<int:pk>/delete/", AdminUserDeleteView.as_view(), name="ap-delete"),
    path("admin-panel/users/<int:pk>/reset-password/", AdminUserPasswordView.as_view(), name="ap-pass"),
    path("admin-panel/users/<int:pk>/subscriptions/", AdminUserSubsView.as_view(), name="ap-subs"),
    path("admin-panel/users/<int:pk>/subscriptions/<int:target_id>/", AdminUserSubDeleteView.as_view(), name="ap-sub-del"),
    path("admin-panel/invites/", AdminInvitesView.as_view(), name="ap-invites"),
    path("admin-panel/invites/<int:pk>/", AdminInviteUpdateView.as_view(), name="ap-invite-update"),
    path("admin-panel/stats/", AdminStatsView.as_view(), name="ap-stats"),
    path("admin-panel/workshops/", AdminWorkshopsView.as_view(), name="ap-workshops"),
    path("admin-panel/workshops/<int:pk>/delete/", AdminWorkshopDeleteView.as_view(), name="ap-ws-del"),
    path("admin-panel/workshops/<int:pk>/", AdminWorkshopUpdateView.as_view(), name="ap-ws-update"),
    path("admin-panel/users/<int:pk>/workshops/", AdminUserWorkshopsView.as_view(), name="ap-user-ws"),
    path("admin-panel/users/<int:pk>/photos/", AdminUserPhotosView.as_view(), name="ap-user-photos"),
    path("admin-panel/users/<int:pk>/photos/<int:photo_id>/", AdminUserPhotoDeleteView.as_view(), name="ap-user-photo-del"),
    path("admin-panel/listings/", AdminListingsView.as_view(), name="ap-listings"),
    path("admin-panel/listings/<int:pk>/set-active/", AdminListingActiveView.as_view(), name="ap-listing-active"),
    path("admin-panel/listings/<int:pk>/update/", AdminListingUpdateView.as_view(), name="ap-listing-update"),
    path("admin-panel/listings/<int:pk>/delete/", AdminListingDeleteView.as_view(), name="ap-listing-del"),
    path("admin-panel/products/", AdminProductsView.as_view(), name="ap-products"),
    path("admin-panel/users/<int:pk>/products/", AdminUserProductsView.as_view(), name="ap-user-products"),
    path("admin-panel/products/<int:pk>/set-active/", AdminProductActiveView.as_view(), name="ap-product-active"),
    path("admin-panel/products/<int:pk>/update/", AdminProductUpdateView.as_view(), name="ap-product-update"),
    path("admin-panel/products/<int:pk>/delete/", AdminProductDeleteView.as_view(), name="ap-product-del"),
    path("admin-panel/users/<int:pk>/slots/", AdminUserSlotsView.as_view(), name="ap-user-slots"),
    path("admin-panel/slots/<int:pk>/", AdminSlotUpdateView.as_view(), name="ap-slot-update"),
    path("admin-panel/orders/", AdminOrdersView.as_view(), name="ap-orders"),
    path("admin-panel/orders/<int:pk>/set-status/", AdminOrderStatusView.as_view(), name="ap-order-status"),
    # ── Подписки и тарифы (Pro / мастерские) ──
    path("admin-panel/subscriptions/", AdminSubscriptionsView.as_view(), name="ap-subscriptions"),
    path("admin-panel/subscriptions/<int:pk>/", AdminSubscriptionUpdateView.as_view(), name="ap-subscription-update"),
    # документация API — только для staff (раскрывает всю карту API)
    path("schema/", SpectacularAPIView.as_view(permission_classes=[IsAdminUser]), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[IsAdminUser]), name="docs"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
