"""Корневой роутер. Всё под /api/v1/."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common.views import StatsView

api_v1 = [
    path("stats/", StatsView.as_view(), name="stats"),
    path("auth/", include("apps.users.urls")),
    path("", include("apps.profiles.urls")),
    path("", include("apps.workshops.urls")),
    path("", include("apps.orders.urls")),
    path("", include("apps.listings.urls")),
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
