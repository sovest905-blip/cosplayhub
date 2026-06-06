from django.contrib import admin
from .models import Profile, SocialLink, Follow, Favorite
admin.site.register(Profile)
admin.site.register(SocialLink)
admin.site.register(Follow)
admin.site.register(Favorite)
