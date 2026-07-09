from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Role, Permission

User = get_user_model()


class Command(BaseCommand):
    help = "Seed initial roles and permissions"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding permissions...")

        permission_codenames = [
            "users.view",
            "users.create",
            "users.edit",
            "users.delete",
            "roles.view",
            "roles.manage",
            "permissions.view",
            "audit.view",
        ]

        permissions = {}

        for codename in permission_codenames:
            perm, created = Permission.objects.get_or_create(
                codename=codename,
                defaults={"description": codename}
            )
            permissions[codename] = perm

        self.stdout.write("Seeding roles...")

        # Admin role
        admin_role, _ = Role.objects.get_or_create(
            name="Admin",
            defaults={"description": "Full system access", "is_system": True},
        )
        admin_role.permissions.set(Permission.objects.all())

        # Manager role
        manager_role, _ = Role.objects.get_or_create(
            name="Manager",
            defaults={"description": "Manage users and view roles"},
        )
        manager_role.permissions.set([
            permissions["users.view"],
            permissions["users.create"],
            permissions["users.edit"],
            permissions["roles.view"],
        ])

        # Viewer role
        viewer_role, _ = Role.objects.get_or_create(
            name="Viewer",
            defaults={"description": "Read-only access"},
        )
        viewer_role.permissions.set([
            permissions["users.view"],
            permissions["roles.view"],
            permissions["permissions.view"],
            permissions["audit.view"],
        ])

        self.stdout.write(self.style.SUCCESS("✅ Seed completed successfully!"))