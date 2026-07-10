#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Auto-create superuser with your credentials
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()

# Superuser 1: your personal account
email1 = 'mohammedsabic17@gmail.com'
if not User.objects.filter(email=email1).exists():
    User.objects.create_superuser(
        email=email1,
        password='sentra@321',
        full_name='Mohammed Sabic'
    )
    print(f'Created superuser: {email1}')
else:
    user = User.objects.get(email=email1)
    user.is_superuser = True
    user.is_staff = True
    user.set_password('sentra@321')
    user.save()
    print(f'Updated superuser: {email1}')

# Superuser 2: backup admin account
email2 = 'admin@example.com'
if not User.objects.filter(email=email2).exists():
    User.objects.create_superuser(
        email=email2,
        password='Admin@123',
        full_name='Admin User'
    )
    print(f'Created superuser: {email2}')
else:
    print(f'Superuser exists: {email2}')
"