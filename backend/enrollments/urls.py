from django.urls import path
from .views import MyEnrollmentsView, EnrollView, UnlockNextLessonView, TeacherStudentRecordsView

urlpatterns = [
    path('me/', MyEnrollmentsView.as_view(), name='my-enrollments'),
    path('enroll/', EnrollView.as_view(), name='enroll'),
    path('<int:enrollment_id>/unlock-next/', UnlockNextLessonView.as_view(), name='unlock-next'),
    path('teacher/records/', TeacherStudentRecordsView.as_view(), name='teacher-student-records'),
]
