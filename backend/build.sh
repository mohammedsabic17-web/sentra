
#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# ============================================
# Auto-create superusers
# ============================================
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()

for email, pwd, name in [
    ('mohammedsabic17@gmail.com', 'sentra@321', 'Mohammed Sabic'),
    ('admin@example.com', 'Admin@123', 'Admin User'),
]:
    if not User.objects.filter(email=email).exists():
        User.objects.create_superuser(email=email, password=pwd, full_name=name)
        print('Created superuser: ' + email)
    else:
        u = User.objects.get(email=email)
        u.is_superuser = True
        u.is_staff = True
        u.save()
        print('Superuser exists: ' + email)
"

# ============================================
# Auto-create roles and permissions
# ============================================
python manage.py shell -c "
from django.contrib.auth import get_user_model
from roles.models import Role, Permission, RolePermission

permissions_data = [
    ('users.view',        'View the user list'),
    ('users.create',      'Invite / add users'),
    ('users.edit',        'Edit users and assign roles'),
    ('users.delete',      'Deactivate users'),
    ('roles.view',        'See roles'),
    ('roles.manage',      'Create/edit roles and permissions'),
    ('permissions.view',  'See permission catalogue'),
    ('audit.view',        'Read the audit log'),
]

for codename, description in permissions_data:
    perm, created = Permission.objects.get_or_create(
        codename=codename,
        defaults={'description': description}
    )
    status = 'Created' if created else 'Exists'
    print(status + ' permission: ' + codename)

roles_data = [
    {
        'name': 'Admin',
        'description': 'Full access, delete-protected',
        'is_system': True,
        'permissions': [
            'users.view', 'users.create', 'users.edit', 'users.delete',
            'roles.view', 'roles.manage', 'permissions.view', 'audit.view'
        ]
    },
    {
        'name': 'Manager',
        'description': 'Manage users, view roles',
        'is_system': False,
        'permissions': [
            'users.view', 'users.create', 'users.edit',
            'users.delete', 'roles.view', 'permissions.view'
        ]
    },
    {
        'name': 'Viewer',
        'description': 'Read-only access',
        'is_system': False,
        'permissions': [
            'users.view', 'roles.view', 'permissions.view'
        ]
    },
]

for role_data in roles_data:
    role, created = Role.objects.get_or_create(
        name=role_data['name'],
        defaults={
            'description': role_data['description'],
            'is_system':   role_data['is_system'],
        }
    )
    status = 'Created' if created else 'Exists'
    print(status + ' role: ' + role.name)

    RolePermission.objects.filter(role=role).delete()

    for perm_code in role_data['permissions']:
        try:
            perm = Permission.objects.get(codename=perm_code)
            RolePermission.objects.get_or_create(role=role, permission=perm)
        except Permission.DoesNotExist:
            print('Permission not found: ' + perm_code)

    count = RolePermission.objects.filter(role=role).count()
    print('Assigned ' + str(count) + ' permissions to ' + role.name)

User = get_user_model()
admin_role = Role.objects.filter(name='Admin').first()

if admin_role:
    for user in User.objects.filter(is_superuser=True):
        try:
            user.roles.add(admin_role)
            print('Assigned Admin role to: ' + user.email)
        except AttributeError:
            print('User has no roles field: ' + user.email)

print('=== Seeding complete ===')
"