from rest_framework import serializers
from .models import Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'course', 'course_title', 'unlocked_lesson_order', 'enrolled_at']
        read_only_fields = ['unlocked_lesson_order', 'enrolled_at']


class TeacherEnrollmentSerializer(serializers.ModelSerializer):
    """Read-only view for the teacher's student-records dashboard —
    shows who's enrolled in what and how far they've progressed."""
    student_username = serializers.CharField(source='student.username', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    total_lessons = serializers.IntegerField(source='course.lessons.count', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student_username', 'student_email', 'course_title',
            'unlocked_lesson_order', 'total_lessons', 'enrolled_at',
        ]


class AdminEnrollmentSerializer(serializers.ModelSerializer):
    """Used on the Admin Dashboard's enroll-student panel — shows who
    enrolled whom (source) alongside the usual progress info."""
    student_username = serializers.CharField(source='student.username', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student_username', 'course', 'course_title',
            'unlocked_lesson_order', 'source', 'enrolled_at',
        ]
