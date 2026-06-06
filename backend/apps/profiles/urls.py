from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProfileViewSet, FollowDetailView, FollowingListView, FollowersListView

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")

urlpatterns = [
    path("follow/following/", FollowingListView.as_view(), name="follow-following"),
    path("follow/followers/", FollowersListView.as_view(), name="follow-followers"),
    path("follow/<int:user_id>/", FollowDetailView.as_view(), name="follow-detail"),
] + router.urls
