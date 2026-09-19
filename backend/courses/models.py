from decimal import Decimal, ROUND_HALF_UP

from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from .validators import validate_file_size

IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm3u8']
DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx']


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    thumbnail = models.ImageField(
        upload_to='course_thumbnails/', blank=True, null=True,
        validators=[FileExtensionValidator(IMAGE_EXTENSIONS), validate_file_size(5)],
    )
    promo_video = models.FileField(
        upload_to='course_promo_videos/', blank=True, null=True,
        help_text="Short promotional clip shown on the public Courses catalog page",
        validators=[FileExtensionValidator(VIDEO_EXTENSIONS), validate_file_size(200)],
    )
    price = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Course price. Purchases aren't wired to a payment gateway yet — "
                   "enrollment is admin-driven for now (see Enrollment.source)."
    )
    discount_percent = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage off the price shown/charged to students (0–100). "
                   "0 means no discount.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def final_price(self):
        """Price after discount_percent is applied, rounded to cents.
        This is the amount actually charged at checkout (see payments.views.CheckoutView)."""
        if not self.discount_percent:
            return self.price
        discounted = self.price * (Decimal(100) - self.discount_percent) / Decimal(100)
        return discounted.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


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
