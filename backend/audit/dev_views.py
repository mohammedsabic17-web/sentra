from django.conf import settings
from django.http import JsonResponse, HttpResponseForbidden
from django.contrib.auth import get_user_model
from .models import AuditLog


def seed_audit(request):
    if not settings.DEBUG:
        return HttpResponseForbidden('Not available')

    remote = request.META.get('REMOTE_ADDR', '')
    if remote not in ('127.0.0.1', '::1'):
        return HttpResponseForbidden('Not allowed')

    User = get_user_model()
    user = User.objects.first()

    sample = [
        ('user.login', 'User logged in'),
        ('user.create', 'Created new user'),
        ('role.create', 'Created role Admin'),
        ('user.deactivate', 'Deactivated user'),
        ('auth.password.change', 'Password changed'),
        ('audit.export', 'Exported audit log'),
    ]

    items = []
    for action, msg in sample:
        a = AuditLog.objects.create(
            actor=user if user else None,
            action=action,
            target_type='user',
            target_id=str(user.id) if user else '',
            changes={'message': msg},
            ip='127.0.0.1'
        )
        items.append({'id': a.id, 'action': a.action, 'message': msg})

    return JsonResponse({'created': len(items), 'items': items})
