from django.urls import path

from .views import TrackVisitView

urlpatterns = [
    path("analytics/track/", TrackVisitView.as_view(), name="analytics-track"),
]
