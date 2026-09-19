from django.contrib import admin
from .models import Assignment, StudentSubmission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'instructions']


@admin.register(StudentSubmission)
class StudentSubmissionAdmin(admin.ModelAdmin):
    list_display = ['student', 'assignment', 'status', 'grade', 'submitted_at']
    list_filter = ['status']
