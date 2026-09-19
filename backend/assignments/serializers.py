from rest_framework import serializers
from .models import Assignment, StudentSubmission


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['id', 'lesson', 'audio_prompt', 'instructions']


class StudentSubmissionSerializer(serializers.ModelSerializer):
    """Used by students to submit their final recording."""

    class Meta:
        model = StudentSubmission
        fields = ['id', 'assignment', 'audio_file', 'submitted_at', 'status']
        read_only_fields = ['submitted_at', 'status']


class TeacherGradingSerializer(serializers.ModelSerializer):
    """Used by teachers to view a submission and attach feedback/grade."""
    student_name = serializers.CharField(source='student.username', read_only=True)

    class Meta:
        model = StudentSubmission
        fields = ['id', 'student_name', 'assignment', 'audio_file', 'submitted_at',
                  'status', 'teacher_feedback', 'grade']
        read_only_fields = ['student_name', 'assignment', 'audio_file', 'submitted_at']
