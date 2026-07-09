from rest_framework.permissions import BasePermission
from .utils import user_has_permission


class HasPermission(BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        permission_map = getattr(view, "permission_map", {})
        required_permission = permission_map.get(view.action)

        if not required_permission:
            return False

        return user_has_permission(request.user, required_permission)