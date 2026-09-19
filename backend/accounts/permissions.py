from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Full access — role='admin' or Django superuser. Admins can do
    everything, including everything teachers can do (see IsTeacherOrAdmin)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and
            (user.role == 'admin' or user.is_superuser)
        )


class IsTeacherOrAdmin(BasePermission):
    """
    Scoped access for teachers: uploaded content, student records,
    assignments, and live-session meeting links — nothing else.
    Admins pass this check too, since admins have full functionality
    (a superset of what teachers can do).
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and
            (user.role in ('teacher', 'admin') or user.is_staff or user.is_superuser)
        )


# Kept for backwards compatibility with existing imports.
IsTeacher = IsTeacherOrAdmin
