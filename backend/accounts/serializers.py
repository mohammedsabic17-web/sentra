from typing import List
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    # Read: return group names as roles
    roles = serializers.SerializerMethodField()

    # Write: accept a list of role names
    roles_input = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'is_active',
            'is_staff',
            'is_superuser',
            'last_login',
            'roles',
            'roles_input',
        ]
        read_only_fields = ['id', 'last_login']

    def get_roles(self, obj) -> List[str]:      # ← type hint added
        return list(obj.groups.values_list('name', flat=True))

    def to_internal_value(self, data):
        # Accept "roles" from frontend but map it to "roles_input"
        if 'roles' in data and 'roles_input' not in data:
            data = data.copy()
            data['roles_input'] = data.pop('roles')
        return super().to_internal_value(data)

    def _set_roles(self, user, role_names):
        groups = []
        for name in role_names:
            group, _ = Group.objects.get_or_create(name=name)
            groups.append(group)
        user.groups.set(groups)

    def create(self, validated_data):
        role_names = validated_data.pop('roles_input', [])
        user = super().create(validated_data)
        self._set_roles(user, role_names)
        return user

    def update(self, instance, validated_data):
        role_names = validated_data.pop('roles_input', None)
        user = super().update(instance, validated_data)
        if role_names is not None:
            self._set_roles(user, role_names)
        return user


# ---- ADD THIS if you don't already have a RegisterSerializer somewhere ----
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user