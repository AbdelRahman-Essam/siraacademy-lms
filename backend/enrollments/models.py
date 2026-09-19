from django.conf import settings
from django.db import models
from courses.models import Course


class Enrollment(models.Model):
    """
    One row per (student, course). `unlocked_lesson_order` is the highest
    lesson order number this student currently has access to — e.g. a
    value of 2 means lessons with order 1 and 2 are unlocked, order 3+
    are still locked. This is the server-side source of truth used by
    courses.views to decide access — never trust a client-sent value.
    """

    class Source(models.TextChoices):
        SELF = 'self', 'Self-enrolled'
        ADMIN = 'admin', 'Enrolled by admin'
        PURCHASE = 'purchase', 'Purchase order (future)'

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    unlocked_lesson_order = models.PositiveIntegerField(default=1)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.SELF)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student} in {self.course} (unlocked up to {self.unlocked_lesson_order})"

    def unlock_next_lesson(self):
        """Call this when a student completes their current lesson."""
        total_lessons = self.course.lessons.count()
        if self.unlocked_lesson_order < total_lessons:
            self.unlocked_lesson_order += 1
            self.save(update_fields=['unlocked_lesson_order'])
