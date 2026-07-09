def user_has_permission(user, permission_codename: str) -> bool:
    if user.is_superuser:
        return True

    if not user.is_authenticated:
        return False

    return user.roles.filter(
        permissions__codename=permission_codename
    ).exists()