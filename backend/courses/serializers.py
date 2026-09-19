from rest_framework import serializers
from .models import Course, Lesson, Attachment


class LessonPublicSerializer(serializers.ModelSerializer):
    """
    Used when listing lessons to a student. `is_unlocked` is computed
    per-request (not stored on the model) based on that student's
    enrollment — see enrollments app. `content_url` is deliberately
    omitted here; the real video URL/token is only issued through the
    dedicated video-access endpoint once unlock is confirmed.
    """
    is_unlocked = serializers.SerializerMethodField()
    meeting_link = serializers.SerializerMethodField()
    assignment_id = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'order', 'is_unlocked', 'meeting_link', 'assignment_id']

    def get_is_unlocked(self, obj):
        unlocked_order = self.context.get('unlocked_order', 0)
        return obj.order <= unlocked_order

    def get_meeting_link(self, obj):
        # Only reveal the live-session link once the lesson is unlocked —
        # same rule as video access, enforced here rather than trusting
        # the frontend to hide it.
        if self.get_is_unlocked(obj):
            return obj.meeting_link
        return None

    def get_assignment_id(self, obj):
        # Lets the frontend know which assignment (if any) to render the
        # AudioRecorder for. Only exposed once unlocked, same as everything else.
        if not self.get_is_unlocked(obj):
            return None
        assignment = obj.assignments.first()
        return assignment.id if assignment else None


class TeacherMeetingLinkSerializer(serializers.ModelSerializer):
    """
    Used on the teacher dashboard. Teachers may ONLY update the
    live-session meeting link — they have no access to uploaded video
    content, encryption keys, or lesson/course structure. All of that
    is admin-only (see Admin*Serializer below).
    """
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Lesson
        fields = ['id', 'course', 'course_title', 'title', 'order', 'meeting_link']
        read_only_fields = ['course', 'course_title', 'title', 'order']


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'lesson', 'file', 'kind', 'original_filename', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    # One field accepts video/photo/document depending on `kind`, so the
    # extension/size check has to happen here rather than as a fixed
    # FileField validator — otherwise nothing stops a 2GB file or a
    # renamed executable from being uploaded as an "attachment".
    ALLOWED_EXTENSIONS = {
        Attachment.Kind.PHOTO: (['jpg', 'jpeg', 'png', 'webp'], 5),
        Attachment.Kind.VIDEO: (['mp4', 'mov', 'webm'], 500),
        Attachment.Kind.DOCUMENT: (['pdf', 'doc', 'docx', 'ppt', 'pptx'], 20),
        Attachment.Kind.OTHER: (['pdf', 'jpg', 'jpeg', 'png', 'webp', 'zip'], 20),
    }

    def validate(self, data):
        file = data.get('file')
        kind = data.get('kind', Attachment.Kind.OTHER)
        if file:
            extensions, max_mb = self.ALLOWED_EXTENSIONS.get(kind, ([], 20))
            ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
            if extensions and ext not in extensions:
                raise serializers.ValidationError(
                    {'file': f"'.{ext}' isn't allowed for kind={kind}. Allowed: {', '.join(extensions)}"}
                )
            if file.size > max_mb * 1024 * 1024:
                raise serializers.ValidationError({'file': f"File too large — max {max_mb}MB for kind={kind}."})
        return data


class AdminLessonSerializer(serializers.ModelSerializer):
    """
    Full read/write access for admins: create/edit lesson structure,
    the uploaded video location, encryption keys, and the meeting link.
    Includes nested attachments (photos/documents) for the single
    Admin Dashboard view.
    """
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ['id', 'course', 'title', 'order', 'content_url', 'meeting_link',
                  'encryption_key_id', 'encryption_key', 'attachments']

    def validate(self, data):
        # Lesson.Meta.unique_together would otherwise surface as a raw
        # 500 IntegrityError — catch it here for a clean 400 instead.
        course = data.get('course') or getattr(self.instance, 'course', None)
        order = data.get('order') or getattr(self.instance, 'order', None)
        if course and order:
            clash = Lesson.objects.filter(course=course, order=order)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError(
                    {'order': f"Lesson {order} already exists for this course."}
                )
        return data


class AdminCourseSerializer(serializers.ModelSerializer):
    """Full read/write access for admins — create/edit/delete courses,
    with nested lessons for the single-dashboard course+lesson view."""
    lessons = AdminLessonSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'thumbnail', 'promo_video', 'price',
                  'created_at', 'lessons']
        read_only_fields = ['created_at']


class CourseSerializer(serializers.ModelSerializer):
    lessons = LessonPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'thumbnail', 'promo_video', 'price', 'lessons']


class CourseCatalogSerializer(serializers.ModelSerializer):
    """
    Lightweight version for the public Courses catalog page — cost,
    thumbnail ("offer photo"), and promo video per course, plus whether
    the current student is already enrolled. No lesson content at all.
    """
    is_enrolled = serializers.SerializerMethodField()
    lesson_count = serializers.IntegerField(source='lessons.count', read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'thumbnail', 'promo_video', 'price',
                  'lesson_count', 'is_enrolled']

    def get_is_enrolled(self, obj):
        student = self.context.get('student')
        if not student:
            return False
        return obj.enrollments.filter(student=student).exists()
