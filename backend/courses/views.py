from django.core import signing
from rest_framework import generics, permissions, parsers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsTeacherOrAdmin
from .models import Course, Lesson, Attachment
from .serializers import (
    CourseSerializer, TeacherMeetingLinkSerializer,
    AdminCourseSerializer, AdminLessonSerializer, AttachmentSerializer,
)
from enrollments.models import Enrollment

VIDEO_TOKEN_MAX_AGE_SECONDS = 300  # 5 minutes
VIDEO_TOKEN_SALT = 'lesson-video-access'


def issue_video_token(student_id, lesson_id):
    """
    Signs "student_id:lesson_id" with Django's SECRET_KEY (TimestampSigner).
    The signature can't be forged without SECRET_KEY, and it embeds the
    time it was issued so it expires automatically (checked in
    verify_video_token). This is what a Shaka Packager key server / your
    HLS-segment-serving endpoint should call verify_video_token against
    before releasing a decryption key or a segment.
    """
    signer = signing.TimestampSigner(salt=VIDEO_TOKEN_SALT)
    return signer.sign(f"{student_id}:{lesson_id}")


def verify_video_token(token, lesson_id):
    """Returns the student_id if the token is valid, unexpired, and for
    this exact lesson — otherwise raises signing.BadSignature/SignatureExpired."""
    signer = signing.TimestampSigner(salt=VIDEO_TOKEN_SALT)
    value = signer.unsign(token, max_age=VIDEO_TOKEN_MAX_AGE_SECONDS)
    student_id, token_lesson_id = value.split(':')
    if int(token_lesson_id) != int(lesson_id):
        raise signing.BadSignature('Token does not match this lesson.')
    return int(student_id)


class CourseListView(generics.ListAPIView):
    """GET /api/courses/  — list all available courses (catalog view)."""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]


class CourseDetailView(generics.RetrieveAPIView):
    """
    GET /api/courses/<id>/  — course detail with lessons, showing which
    ones are unlocked FOR THIS STUDENT based on their enrollment record.
    This is the server-side source of truth the frontend must rely on.
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        enrollment = Enrollment.objects.filter(
            student=self.request.user, course_id=self.kwargs['pk']
        ).first()
        context['unlocked_order'] = enrollment.unlocked_lesson_order if enrollment else 0
        return context


class LessonVideoAccessView(APIView):
    """
    GET /api/courses/lessons/<id>/video-token/
    Returns a short-lived signed token needed to decrypt/play this
    lesson's HLS video — ONLY if the requesting student is enrolled
    and this lesson is unlocked for them. This is where real
    protection is enforced, not in the frontend.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, lesson_id):
        lesson = Lesson.objects.filter(id=lesson_id).first()
        if not lesson:
            return Response({'detail': 'Lesson not found.'}, status=404)

        enrollment = Enrollment.objects.filter(
            student=request.user, course=lesson.course
        ).first()

        if not enrollment or lesson.order > enrollment.unlocked_lesson_order:
            return Response({'detail': 'This lesson is locked.'}, status=403)

        token = issue_video_token(request.user.id, lesson.id)
        return Response({
            'content_url': lesson.content_url,
            'token': token,
            'expires_in': VIDEO_TOKEN_MAX_AGE_SECONDS,
        })


class VideoTokenVerifyView(APIView):
    """
    GET /api/courses/lessons/<id>/verify-token/?token=...
    Called by the segment/key-serving layer (e.g. an nginx auth_request,
    or your Shaka Packager key server) to check a token before releasing
    an HLS segment or decryption key. Kept as a separate internal-facing
    endpoint so it can later be locked down to internal network only.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, lesson_id):
        token = request.query_params.get('token', '')
        try:
            student_id = verify_video_token(token, lesson_id)
        except signing.SignatureExpired:
            return Response({'valid': False, 'reason': 'expired'}, status=403)
        except signing.BadSignature:
            return Response({'valid': False, 'reason': 'invalid'}, status=403)

        return Response({'valid': True, 'student_id': student_id})


class LessonDecryptionKeyView(APIView):
    """
    GET /api/courses/lessons/<id>/decryption-key/?token=...
    This is the endpoint your HLS player (or an nginx auth_request
    config, for production) calls to get the actual AES-128 key —
    it only ever returns it after re-verifying the same signed token
    used for video-token access, so the key is never handed out to a
    student whose access has expired or was never valid.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, lesson_id):
        token = request.query_params.get('token', '')
        lesson = Lesson.objects.filter(id=lesson_id).first()
        if not lesson:
            return Response({'detail': 'Lesson not found.'}, status=404)

        try:
            verify_video_token(token, lesson_id)
        except signing.SignatureExpired:
            return Response({'detail': 'Token expired.'}, status=403)
        except signing.BadSignature:
            return Response({'detail': 'Invalid token.'}, status=403)

        if not lesson.encryption_key:
            return Response({'detail': 'No encryption key set for this lesson yet.'}, status=404)

        return Response({
            'key_id': lesson.encryption_key_id,
            'key': lesson.encryption_key,
        })


class TeacherMeetingLinkListView(generics.ListAPIView):
    """
    GET /api/courses/teacher/lessons/
    Teacher dashboard: every lesson across every course, so a teacher
    can set the live-session meeting link. Teachers have NO access to
    uploaded video content, encryption keys, or course/lesson structure
    — that's admin-only (see Admin* views below). Scoped by
    IsTeacherOrAdmin; admins can reach this too since they have full
    functionality, but they'll normally use the Admin Dashboard instead.
    """
    serializer_class = TeacherMeetingLinkSerializer
    permission_classes = [IsTeacherOrAdmin]
    queryset = Lesson.objects.select_related('course').all()


class TeacherMeetingLinkUpdateView(generics.UpdateAPIView):
    """PATCH /api/courses/teacher/lessons/<id>/ — meeting_link only."""
    serializer_class = TeacherMeetingLinkSerializer
    permission_classes = [IsTeacherOrAdmin]
    queryset = Lesson.objects.all()


# ── Admin: full course & lesson management (single dashboard) ──────────

class AdminCourseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/courses/admin/courses/   — list all courses (with nested lessons)
    POST /api/courses/admin/courses/   — create a new course
    Admin-only. This is the "+ Add Course" button's endpoint.
    """
    serializer_class = AdminCourseSerializer
    permission_classes = [IsAdmin]
    queryset = Course.objects.all().prefetch_related('lessons', 'lessons__attachments')


class AdminCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/courses/admin/courses/<id>/ — edit or remove a course."""
    serializer_class = AdminCourseSerializer
    permission_classes = [IsAdmin]
    queryset = Course.objects.all()


class AdminLessonListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/courses/admin/lessons/?course=<id>  — list lessons (optionally filtered)
    POST /api/courses/admin/lessons/              — create a lesson (the "+ Add Lesson" button)
    """
    serializer_class = AdminLessonSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Lesson.objects.select_related('course').prefetch_related('attachments')
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs


class AdminLessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/courses/admin/lessons/<id>/
    Full lesson editing: title, order, content_url, meeting_link,
    encryption keys — everything, admin-only.
    """
    serializer_class = AdminLessonSerializer
    permission_classes = [IsAdmin]
    queryset = Lesson.objects.all()


class AdminMediaUploadView(generics.CreateAPIView):
    """
    POST /api/courses/admin/upload/  (multipart/form-data: lesson, file, kind)
    The single "upload video / photo / attachment" button on the Admin
    Dashboard. `kind` is one of: video, photo, document, other.

    NOTE on video uploads: this stores the raw file as-is and creates an
    Attachment record — it does NOT run the FFmpeg + Shaka Packager
    encryption pipeline (scripts/process_video.py). For a lesson's real
    protected video, still run that script separately and paste the
    resulting master.m3u8 path + key into the lesson's content_url /
    encryption fields via the Admin Dashboard. This upload button is for
    quick raw uploads and supplementary materials (photos, worksheets,
    PDFs), not a replacement for the protected video pipeline.
    """
    serializer_class = AttachmentSerializer
    permission_classes = [IsAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        serializer.save(original_filename=getattr(uploaded_file, 'name', ''))


class AdminAttachmentDeleteView(generics.DestroyAPIView):
    """DELETE /api/courses/admin/attachments/<id>/"""
    serializer_class = AttachmentSerializer
    permission_classes = [IsAdmin]
    queryset = Attachment.objects.all()
