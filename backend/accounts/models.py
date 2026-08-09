from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model so we can add academy-specific fields
    (role, device binding) without fighting Django's default User later.
    """

    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        TEACHER = 'teacher', 'Teacher'
        ADMIN = 'admin', 'Admin'

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)

    # Optional: bind the account to one device to reduce account sharing.
    # Store a hash/identifier sent by the frontend on first login; reject
    # logins from a different device_id if this is set.
    device_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
