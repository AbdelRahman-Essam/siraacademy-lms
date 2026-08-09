from django.db import models


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Lesson(models.Model):
    """
    `order` defines the drip sequence — lesson 1 unlocks lesson 2, etc.
    `content_url` points to the HLS master playlist for this lesson's
    encrypted video (served through the protected video-token flow, not
    a plain public URL). Uploaded content (video + encryption keys) is
    admin-managed only — teachers do not have access to it.
    """
    course = models.ForeignKey(Course, related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    content_url = models.CharField(max_length=500, blank=True, help_text="Path to encrypted HLS playlist")
    encryption_key_id = models.CharField(
        max_length=64, blank=True,
        help_text="From scripts/process_video.py output (key.txt) — paste key_id here"
    )
    encryption_key = models.CharField(
        max_length=64, blank=True,
        help_text="From scripts/process_video.py output (key.txt) — paste key here. "
                   "Only ever served to a client after video-token verification."
    )
    meeting_link = models.URLField(
        max_length=500, blank=True,
        help_text="Zoom/Google Meet link for this lesson's live session (teacher-managed)"
    )

    class Meta:
        ordering = ['order']
        unique_together = ('course', 'order')

    def __str__(self):
        return f"{self.course.title} — Lesson {self.order}: {self.title}"


class Attachment(models.Model):
    """
    Supplementary material for a lesson — a photo, worksheet, PDF, or any
    other file besides the main protected video. Uploaded and managed by
    admins only, from the single Admin Dashboard (Courses & Lessons).
    Unlike the video, these are served as plain files (no token gating) —
    add unlock-gating here too if attachments should stay locked like the
    video does.
    """

    class Kind(models.TextChoices):
        PHOTO = 'photo', 'Photo'
        VIDEO = 'video', 'Video (raw, unencrypted)'
        DOCUMENT = 'document', 'Document'
        OTHER = 'other', 'Other'

    lesson = models.ForeignKey(Lesson, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(upload_to='lesson_attachments/%Y/%m/')
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.OTHER)
    original_filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_kind_display()} for {self.lesson}"
