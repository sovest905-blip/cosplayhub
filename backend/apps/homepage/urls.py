from django.urls import path

from .views import CuratedListView, CategoryListView

urlpatterns = [
    path("curated/", CuratedListView.as_view(), name="curated-list"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
]
