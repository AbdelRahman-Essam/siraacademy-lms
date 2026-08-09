from django.contrib import admin
from .models import Enrollment


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'unlocked_lesson_order', 'enrolled_at']
    list_filter = ['course']
