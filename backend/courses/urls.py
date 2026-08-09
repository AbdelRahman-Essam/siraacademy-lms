from django.urls import path
from .views import (
    CourseListView, CourseDetailView, LessonVideoAccessView, VideoTokenVerifyView,
    LessonDecryptionKeyView, TeacherMeetingLinkListView, TeacherMeetingLinkUpdateView,
    AdminCourseListCreateView, AdminCourseDetailView,
    AdminLessonListCreateView, AdminLessonDetailView,
    AdminMediaUploadView, AdminAttachmentDeleteView,
)

urlpatterns = [
    # Student-facing
    path('', CourseListView.as_view(), name='course-list'),
    path('<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('lessons/<int:lesson_id>/video-token/', LessonVideoAccessView.as_view(), name='lesson-video-token'),
    path('lessons/<int:lesson_id>/verify-token/', VideoTokenVerifyView.as_view(), name='lesson-verify-token'),
    path('lessons/<int:lesson_id>/decryption-key/', LessonDecryptionKeyView.as_view(), name='lesson-decryption-key'),

    # Teacher — meeting link only, NO access to uploaded content
    path('teacher/lessons/', TeacherMeetingLinkListView.as_view(), name='teacher-meeting-link-list'),
    path('teacher/lessons/<int:pk>/', TeacherMeetingLinkUpdateView.as_view(), name='teacher-meeting-link-update'),

    # Admin — full course & lesson management (single dashboard)
    path('admin/courses/', AdminCourseListCreateView.as_view(), name='admin-course-list-create'),
    path('admin/courses/<int:pk>/', AdminCourseDetailView.as_view(), name='admin-course-detail'),
    path('admin/lessons/', AdminLessonListCreateView.as_view(), name='admin-lesson-list-create'),
    path('admin/lessons/<int:pk>/', AdminLessonDetailView.as_view(), name='admin-lesson-detail'),
    path('admin/upload/', AdminMediaUploadView.as_view(), name='admin-media-upload'),
    path('admin/attachments/<int:pk>/', AdminAttachmentDeleteView.as_view(), name='admin-attachment-delete'),
]
