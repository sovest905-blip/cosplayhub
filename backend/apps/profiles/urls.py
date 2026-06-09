from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (ProfileViewSet, FollowDetailView, FollowingListView, FollowersListView,
                    FavoriteDetailView, FavoriteListView, MyPhotosView, MyPhotoDeleteView,
                    FanMatchesView)

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")

urlpatterns = [
    path("profiles/fan-matches/", FanMatchesView.as_view(), name="fan-matches"),
    path("profiles/me/photos/", MyPhotosView.as_view(), name="my-photos"),
    path("profiles/me/photos/<int:photo_id>/", MyPhotoDeleteView.as_view(), name="my-photo-delete"),
    path("follow/following/", FollowingListView.as_view(), name="follow-following"),
    path("follow/followers/", FollowersListView.as_view(), name="follow-followers"),
    path("follow/<int:user_id>/", FollowDetailView.as_view(), name="follow-detail"),
    path("favorites/", FavoriteListView.as_view(), name="favorites"),
    path("favorites/<str:kind>/<int:object_id>/", FavoriteDetailView.as_view(), name="favorite-detail"),
] + router.urls
