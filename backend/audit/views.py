from rest_framework.viewsets import ReadOnlyModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import AuditLog
from .serializers import AuditLogSerializer
from roles.permissions import HasPermission


# ============================================
# Audit Log ViewSet
# ============================================
class AuditLogViewSet(ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [HasPermission]

    # ✅ List Contract
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["action", "actor"]
    search_fields = ["action", "target_type"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    permission_map = {
        "list": "audit.view",
        "retrieve": "audit.view",
    }