from django.urls import path
from .views import (
    AssignmentDetailView, SubmitRecordingView, MySubmissionsView,
    TeacherSubmissionListView, TeacherGradeSubmissionView,
)

urlpatterns = [
    path('<int:pk>/', AssignmentDetailView.as_view(), name='assignment-detail'),
    path('submit/', SubmitRecordingView.as_view(), name='submit-recording'),
    path('me/', MySubmissionsView.as_view(), name='my-submissions'),
    path('review/', TeacherSubmissionListView.as_view(), name='teacher-review-list'),
    path('review/<int:pk>/', TeacherGradeSubmissionView.as_view(), name='teacher-grade'),
]
