from django.conf import settings
from django.db import models
from courses.models import Lesson


class Assignment(models.Model):
    """A listening prompt attached to a lesson, e.g. 'Listen and repeat'."""
    lesson = models.ForeignKey(Lesson, related_name='assignments', on_delete=models.CASCADE)
    audio_prompt = models.FileField(upload_to='assignment_prompts/')
    instructions = models.TextField(blank=True)

    def __str__(self):
        return f"Assignment for {self.lesson}"


class StudentSubmission(models.Model):
    """
    One student's final recorded response. Re-recording/preview happens
    entirely client-side before submission — only the final take is
    ever sent here. Once status is 'submitted' or 'graded', the audio
    file should be treated as locked (no re-upload allowed).
    """

    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Submitted'
        GRADED = 'graded', 'Graded'

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    audio_file = models.FileField(upload_to='student_submissions/')
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUBMITTED)
    teacher_feedback = models.TextField(blank=True)
    grade = models.CharField(max_length=10, blank=True)

    class Meta:
        unique_together = ('student', 'assignment')  # one final submission per assignment

    def __str__(self):
        return f"{self.student} — {self.assignment} ({self.status})"
