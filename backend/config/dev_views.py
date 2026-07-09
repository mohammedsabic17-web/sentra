from django.conf import settings
from django.http import JsonResponse, HttpResponseForbidden
from pathlib import Path


def dev_token(request):
    # Only available in DEBUG and from localhost
    if not settings.DEBUG:
        return HttpResponseForbidden('Not available')

    remote = request.META.get('REMOTE_ADDR', '')
    if remote not in ('127.0.0.1', '::1'):
        return HttpResponseForbidden('Not allowed')

    token_file = Path(settings.BASE_DIR) / 'access_token.txt'
    if not token_file.exists():
        return JsonResponse({'access_token': None})

    token = token_file.read_text().strip()
    return JsonResponse({'access_token': token})
