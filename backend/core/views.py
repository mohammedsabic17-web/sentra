from django.contrib.auth import get_user_model
from rest_framework import serializers as drf_serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema, inline_serializer

from roles.models import Role
from audit.models import AuditLog


# ============================================
# Inline serializers (for Swagger docs)
# ============================================

# Define recent activity fields
recent_activity_fields = {
    "id": drf_serializers.IntegerField(),
    "time": drf_serializers.DateTimeField(),
    "actor": drf_serializers.EmailField(allow_null=True),
    "action": drf_serializers.CharField(),
    "message": drf_serializers.CharField(allow_null=True),
}

DashboardSummarySerializer = inline_serializer(
    name="DashboardSummary",
    fields={
        "total_users": drf_serializers.IntegerField(),
        "active": drf_serializers.IntegerField(),
        "roles": drf_serializers.IntegerField(),
        "audit_events": drf_serializers.IntegerField(),
        "permissions": drf_serializers.ListField(child=drf_serializers.CharField()),
        "recent": drf_serializers.ListField(
            child=inline_serializer(
                name="RecentActivity",
                fields=recent_activity_fields,
            )
        ),
    },
)


# ============================================
# Dashboard Summary View
# ============================================
class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardSummarySerializer

    @extend_schema(
        responses={200: DashboardSummarySerializer},
        description="Return overall dashboard statistics including user counts, "
                    "roles, audit events, current user's permissions, and the "
                    "6 most recent audit log entries.",
    )
    def get(self, request):
        User = get_user_model()
        total_users = User.objects.count()
        active = User.objects.filter(is_active=True).count()
        roles_count = Role.objects.count()
        audit_events = AuditLog.objects.count()

        # permissions for current user
        perms = set()
        for r in request.user.roles.all():
            for p in r.permissions.all():
                perms.add(p.codename)

        # recent audit (last 6)
        recent = []
        for a in AuditLog.objects.all()[:6]:
            msg = None
            if a.changes is None:
                msg = None
            elif isinstance(a.changes, dict):
                msg = a.changes.get('message') or str(a.changes)
            else:
                msg = str(a.changes)

            recent.append({
                'id': a.id,
                'time': a.created_at.isoformat(),
                'actor': a.actor.email if a.actor else None,
                'action': a.action,
                'message': msg,
            })

        return Response({
            'total_users': total_users,
            'active': active,
            'roles': roles_count,
            'audit_events': audit_events,
            'permissions': list(perms),
            'recent': recent,
        })