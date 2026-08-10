from django.urls import path
from .views import (
    MyEnrollmentsView, EnrollView, UnlockNextLessonView, TeacherStudentRecordsView,
    AdminEnrollView, AdminEnrollmentListView, AdminUnenrollView,
)

urlpatterns = [
    path('me/', MyEnrollmentsView.as_view(), name='my-enrollments'),
    path('enroll/', EnrollView.as_view(), name='enroll'),
    path('<int:enrollment_id>/unlock-next/', UnlockNextLessonView.as_view(), name='unlock-next'),
    path('teacher/records/', TeacherStudentRecordsView.as_view(), name='teacher-student-records'),

    # Admin — manual enrollment (today's primary path; purchase flow plugs in later)
    path('admin/enroll/', AdminEnrollView.as_view(), name='admin-enroll'),
    path('admin/list/', AdminEnrollmentListView.as_view(), name='admin-enrollment-list'),
    path('admin/<int:pk>/', AdminUnenrollView.as_view(), name='admin-unenroll'),
]
