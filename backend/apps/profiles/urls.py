from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (ProfileViewSet, FollowDetailView, FollowingListView, FollowersListView,
                    FavoriteDetailView, FavoriteListView, MyPhotosView, MyPhotoDeleteView,
                    FanMatchesView, MyViewersView, ProfileBySlugView, MyMediaKitView,
                    MyRoleMediaView, MascotListView)

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")

urlpatterns = [
    path("mascots/", MascotListView.as_view(), name="mascots"),
    path("profiles/fan-matches/", FanMatchesView.as_view(), name="fan-matches"),
    path("profiles/me/viewers/", MyViewersView.as_view(), name="my-viewers"),
    path("profiles/me/media-kit/", MyMediaKitView.as_view(), name="my-media-kit"),
    path("profiles/by-slug/<slug:slug>/", ProfileBySlugView.as_view(), name="profile-by-slug"),
    path("profiles/me/role-media/<str:role>/<str:kind>/", MyRoleMediaView.as_view(), name="my-role-media"),
    path("profiles/me/photos/", MyPhotosView.as_view(), name="my-photos"),
    path("profiles/me/photos/<int:photo_id>/", MyPhotoDeleteView.as_view(), name="my-photo-delete"),
    path("follow/following/", FollowingListView.as_view(), name="follow-following"),
    path("follow/followers/", FollowersListView.as_view(), name="follow-followers"),
    path("follow/<int:user_id>/", FollowDetailView.as_view(), name="follow-detail"),
    path("favorites/", FavoriteListView.as_view(), name="favorites"),
    path("favorites/<str:kind>/<int:object_id>/", FavoriteDetailView.as_view(), name="favorite-detail"),
] + router.urls
