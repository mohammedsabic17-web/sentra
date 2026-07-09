#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Auto-create superuser if it doesn't exist
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
email = 'admin@example.com'
password = 'Admin@123'
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password=password, full_name='Admin User')
    print(f'✓ Superuser created: {email}')
else:
    print(f'✓ Superuser already exists: {email}')
"