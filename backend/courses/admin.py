from django.contrib import admin
from .models import Course, Lesson, Attachment


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0
    readonly_fields = ['uploaded_at']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'price', 'created_at']
    fields = ['title', 'description', 'thumbnail', 'promo_video', 'price']
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'meeting_link']
    list_filter = ['course']
    fields = ['course', 'title', 'order', 'content_url', 'meeting_link',
              'encryption_key_id', 'encryption_key']
    inlines = [AttachmentInline]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'kind', 'original_filename', 'uploaded_at']
    list_filter = ['kind']
