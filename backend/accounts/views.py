from django.contrib.auth import get_user_model
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework import status, serializers as drf_serializers

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse

from roles.permissions import HasPermission
from roles.models import Role
from audit.mixins import AuditMixin
from .serializers import UserSerializer

User = get_user_model()


# ============================================
# Inline serializers for Swagger docs
# ============================================
MeResponseSerializer = inline_serializer(
    name="MeResponse",
    fields={
        "id": drf_serializers.CharField(),
        "email": drf_serializers.EmailField(),
        "full_name": drf_serializers.CharField(),
        "roles": drf_serializers.ListField(child=drf_serializers.CharField()),
        "permissions": drf_serializers.ListField(child=drf_serializers.CharField()),
    },
)

MessageResponseSerializer = inline_serializer(
    name="MessageResponse",
    fields={"message": drf_serializers.CharField()},
)

RegisterRequestSerializer = inline_serializer(
    name="RegisterRequest",
    fields={
        "email": drf_serializers.EmailField(),
        "password": drf_serializers.CharField(),
        "full_name": drf_serializers.CharField(required=False),
    },
)

AssignRolesRequestSerializer = inline_serializer(
    name="AssignRolesRequest",
    fields={
        "roles": drf_serializers.ListField(child=drf_serializers.IntegerField()),
    },
)


# ============================================
# User ViewSet
# ============================================
class UserViewSet(AuditMixin, ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [HasPermission]

    # ✅ List Contract
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active", "is_staff"]
    search_fields = ["email", "full_name"]
    ordering_fields = ["email", "created_at"]
    ordering = ["-created_at"]

    # ✅ Permission Mapping
    permission_map = {
        "list": "users.view",
        "retrieve": "users.view",
        "create": "users.create",
        "update": "users.edit",
        "partial_update": "users.edit",
        "destroy": "users.delete",
        "assign_roles": "roles.manage",
    }

    # ✅ Audit Logging
    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_action(
            self.request,
            action="user.created",
            instance=instance,
            changes=serializer.validated_data,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        self.log_action(
            self.request,
            action="user.updated",
            instance=instance,
            changes=serializer.validated_data,
        )

    def perform_destroy(self, instance):
        self.log_action(
            self.request,
            action="user.deleted",
            instance=instance,
        )
        instance.delete()

    # ✅ Role Assignment Endpoint
    @extend_schema(
        request=AssignRolesRequestSerializer,
        responses={200: MessageResponseSerializer},
        description="Assign a list of roles (by ID) to a user.",
    )
    @action(detail=True, methods=["put"], url_path="roles")
    def assign_roles(self, request, pk=None):
        user = self.get_object()
        role_ids = request.data.get("roles", [])

        roles = Role.objects.filter(id__in=role_ids)
        user.roles.set(roles)

        self.log_action(
            request,
            action="user.roles.updated",
            instance=user,
            changes={"roles": role_ids},
        )

        return Response(
            {"message": "Roles updated successfully"},
            status=status.HTTP_200_OK,
        )


# ============================================
# Auth Views
# ============================================
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer  # helps drf-spectacular introspection

    @extend_schema(
        responses={200: MeResponseSerializer},
        description="Get the current authenticated user's profile, roles, and permissions.",
    )
    def get(self, request):
        user = request.user
        roles = user.roles.all()

        permissions = set()
        for role in roles:
            for perm in role.permissions.all():
                permissions.add(perm.codename)

        return Response({
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "roles": [role.name for role in roles],
            "permissions": list(permissions),
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageResponseSerializer  # placeholder for schema

    @extend_schema(
        request=None,
        responses={200: MessageResponseSerializer},
        description="Log out the currently authenticated user.",
    )
    def post(self, request):
        return Response({"message": "Logged out"})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterRequestSerializer  # placeholder for schema

    @extend_schema(
        request=RegisterRequestSerializer,
        responses={
            201: MessageResponseSerializer,
            400: OpenApiResponse(description="Missing email or password"),
        },
        description="Register a new user account with email, password, and full name.",
    )
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        full_name = request.data.get("full_name")

        if not email or not password:
            return Response(
                {"detail": "Email and password required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
        )

        return Response(
            {"message": "User created successfully"},
            status=status.HTTP_201_CREATED,
        )