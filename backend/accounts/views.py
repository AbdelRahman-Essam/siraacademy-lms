from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/  — create a new student account."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role/username to the JWT payload so the frontend can read it
    without an extra API call. Also includes is_staff/is_superuser so a
    Django superuser (created via createsuperuser, which doesn't set the
    custom `role` field) is still recognized as an admin client-side —
    mirroring the backend's IsAdmin permission check."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        return token


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/  — returns access + refresh JWT tokens."""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'


class MeView(APIView):
    """GET /api/auth/me/  — return the logged-in user's own profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
