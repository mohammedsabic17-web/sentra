from .models import AuditLog


class AuditMixin:

    def log_action(self, request, action, instance=None, changes=None):
        AuditLog.objects.create(
            actor=request.user if request.user.is_authenticated else None,
            action=action,
            target_type=instance.__class__.__name__ if instance else None,
            target_id=str(instance.pk) if instance else None,
            changes=changes or {},
            ip=self.get_client_ip(request),
        )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR")