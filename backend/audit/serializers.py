from typing import Optional
from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    detail = serializers.SerializerMethodField()
    actor_email = serializers.SerializerMethodField()
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['detail'] = self.get_detail(instance)
        data['actor_email'] = self.get_actor_email(instance)
        data['actor_name'] = self.get_actor_name(instance)
        return data

    # ---------- ACTOR ----------
    def get_actor_email(self, obj) -> Optional[str]:
        actor = getattr(obj, 'actor', None) or getattr(obj, 'user', None)
        if actor is None:
            return None
        return getattr(actor, 'email', None) or str(actor)

    def get_actor_name(self, obj) -> Optional[str]:
        actor = getattr(obj, 'actor', None) or getattr(obj, 'user', None)
        if actor is None:
            return None
        return (
            getattr(actor, 'full_name', None)
            or getattr(actor, 'get_full_name', lambda: None)()
            or getattr(actor, 'username', None)
            or getattr(actor, 'email', None)
        )

    # ---------- DETAIL ----------
    def get_detail(self, obj) -> Optional[str]:
        changes = getattr(obj, 'changes', None)
        action = getattr(obj, 'action', '') or ''

        if changes is None:
            return self._fallback_detail(obj, action)

        if isinstance(changes, dict):
            if changes.get('message'):
                return changes['message']
            return self._humanize(changes, action)

        return str(changes)

    def _humanize(self, data, action):
        """Turn a dict of changes into a human-readable sentence."""
        email = data.get('email') or data.get('user_email') or data.get('target_email')
        name = data.get('full_name') or data.get('name') or data.get('username')
        roles = data.get('roles_input') or data.get('roles') or data.get('groups')
        role_name = data.get('role_name') or data.get('role')
        permission = data.get('permission') or data.get('perm')
        ip = data.get('ip') or data.get('ip_address')

        roles_str = ', '.join(roles) if isinstance(roles, (list, tuple)) else roles

        if 'user.created' in action or 'user_created' in action:
            base = f"Created user {name or email or ''}".strip()
            return f"{base} with role {roles_str}" if roles_str else base

        if 'user.updated' in action or 'user.update' in action or 'user_updated' in action:
            base = f"Updated user {name or email or ''}".strip()
            return f"{base} (roles: {roles_str})" if roles_str else base

        if 'user.deactivated' in action:
            return f"Deactivated user {email or name or ''}".strip()

        if 'user.activated' in action:
            return f"Activated user {email or name or ''}".strip()

        if 'role.update' in action or 'role.updated' in action:
            if permission and role_name:
                verb = 'Added' if data.get('added') else 'Removed' if data.get('removed') else 'Updated'
                prep = 'to' if data.get('added') else 'from' if data.get('removed') else 'on'
                return f"{verb} {permission} {prep} {role_name}"
            if role_name:
                return f"Updated role {role_name}"

        if 'role.created' in action:
            return f"Created role {role_name or ''}".strip()

        if 'role.deleted' in action:
            return f"Deleted role {role_name or ''}".strip()

        if 'auth.login' in action:
            return f"Signed in from {ip}" if ip else "Signed in"
        if 'auth.logout' in action:
            return "Signed out"

        return ' · '.join(
            f"{k}: {', '.join(v) if isinstance(v, (list, tuple)) else v}"
            for k, v in data.items()
            if v is not None
        )

    def _fallback_detail(self, obj, action):
        target = getattr(obj, 'target', None) or getattr(obj, 'object_repr', None)
        return f"{action} {target}".strip() if target else action or '—'