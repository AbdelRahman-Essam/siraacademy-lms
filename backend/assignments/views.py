from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsTeacherOrAdmin
from enrollments.models import Enrollment
from .models import Assignment, StudentSubmission
from .serializers import AssignmentSerializer, StudentSubmissionSerializer, TeacherGradingSerializer


class AssignmentDetailView(generics.RetrieveAPIView):
    """
    GET /api/assignments/<id>/
    Returns the prompt audio + instructions for a single assignment —
    only if the student is enrolled and the assignment's lesson is
    unlocked for them (same rule as video access).
    """
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Assignment.objects.select_related('lesson')

    def get_object(self):
        assignment = super().get_object()
        lesson = assignment.lesson
        enrollment = Enrollment.objects.filter(
            student=self.request.user, course=lesson.course
        ).first()
        if not enrollment or lesson.order > enrollment.unlocked_lesson_order:
            raise PermissionDenied('This lesson is not unlocked for you yet.')
        return assignment


class SubmitRecordingView(generics.CreateAPIView):
    """
    POST /api/assignments/submit/  (multipart/form-data: assignment, audio_file)
    Final submission only — the frontend handles re-record/preview
    entirely client-side before calling this once. Server re-checks that
    the assignment's lesson is actually unlocked for this student before
    accepting the file, so a direct API call can't bypass the drip logic.
    """
    serializer_class = StudentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        assignment = serializer.validated_data['assignment']
        lesson = assignment.lesson
        enrollment = Enrollment.objects.filter(
            student=self.request.user, course=lesson.course
        ).first()

        if not enrollment or lesson.order > enrollment.unlocked_lesson_order:
            raise PermissionDenied('This lesson is not unlocked for you yet.')

        serializer.save(student=self.request.user)


class MySubmissionsView(generics.ListAPIView):
    """GET /api/assignments/me/ — a student's own submissions and grades."""
    serializer_class = StudentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudentSubmission.objects.filter(student=self.request.user)


class TeacherSubmissionListView(generics.ListAPIView):
    """
    GET /api/assignments/review/
    Teacher dashboard: list all student submissions to grade.
    Restricted to staff/teacher accounts.
    """
    serializer_class = TeacherGradingSerializer
    permission_classes = [IsTeacherOrAdmin]
    queryset = StudentSubmission.objects.all().order_by('-submitted_at')


class TeacherGradeSubmissionView(generics.UpdateAPIView):
    """PATCH /api/assignments/review/<id>/ — attach feedback + grade."""
    serializer_class = TeacherGradingSerializer
    permission_classes = [IsTeacherOrAdmin]
    queryset = StudentSubmission.objects.all()

    def perform_update(self, serializer):
        serializer.save(status=StudentSubmission.Status.GRADED)
