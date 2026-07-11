from django.urls import path

from .views import CuratedListView, CategoryListView
from .weekly import WeeklyPicksView

urlpatterns = [
    path("curated/", CuratedListView.as_view(), name="curated-list"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("weekly-picks/", WeeklyPicksView.as_view(), name="weekly-picks"),
]
