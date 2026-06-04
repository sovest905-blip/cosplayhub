from django.contrib.auth import login, logout
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from .serializers import RegisterSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "login"
    throttle_classes = [ScopedRateThrottle]

class LoginView(APIView):
    """Логин -> сессия в HttpOnly cookie. Без JWT в localStorage."""
    permission_classes = [AllowAny]
    throttle_scope = "login"          # лимит против брутфорса
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        from django.contrib.auth import authenticate
        user = authenticate(
            request,
            username=request.data.get("email"),
            password=request.data.get("password"),
        )
        if user is None:
            return Response({"detail": "Неверный email или пароль"},
                            status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response(UserSerializer(user).data)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    def get_object(self):
        return self.request.user
