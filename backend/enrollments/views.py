from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTeacherOrAdmin
from courses.models import Course
from .models import Enrollment
from .serializers import EnrollmentSerializer, TeacherEnrollmentSerializer


class MyEnrollmentsView(generics.ListAPIView):
    """GET /api/enrollments/me/ — list the logged-in student's enrollments."""
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Enrollment.objects.filter(student=self.request.user)


class EnrollView(APIView):
    """
    POST /api/enrollments/enroll/  { "course_id": 1 }
    Creates an enrollment starting with only lesson 1 unlocked.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('course_id')
        course = Course.objects.filter(id=course_id).first()
        if not course:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user, course=course
        )
        if not created:
            return Response({'detail': 'Already enrolled.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)


class UnlockNextLessonView(APIView):
    """
    POST /api/enrollments/<enrollment_id>/unlock-next/
    Advances the unlocked lesson count by one. In production, gate this
    behind a real completion check (e.g. quiz passed, assignment
    submitted) rather than calling it directly from the frontend on demand.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, enrollment_id):
        enrollment = Enrollment.objects.filter(id=enrollment_id, student=request.user).first()
        if not enrollment:
            return Response({'detail': 'Enrollment not found.'}, status=status.HTTP_404_NOT_FOUND)

        enrollment.unlock_next_lesson()
        return Response(EnrollmentSerializer(enrollment).data)


class TeacherStudentRecordsView(generics.ListAPIView):
    """
    GET /api/enrollments/teacher/records/  (optional ?course=<id> filter)
    Read-only student records for teachers: who's enrolled, in what
    course, and how far they've progressed. Teachers can view this but
    cannot unlock lessons manually or edit enrollments — that stays an
    admin action.
    """
    serializer_class = TeacherEnrollmentSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        qs = Enrollment.objects.select_related('student', 'course')
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs
