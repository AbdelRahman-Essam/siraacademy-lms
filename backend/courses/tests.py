"""
Tests for the progressive-unlock and video-protection logic — the part
of the platform where a bug means a student sees content they haven't
unlocked, or a teacher reaches content they're explicitly barred from.
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from courses.models import Course, Lesson
from courses.views import issue_video_token
from enrollments.models import Enrollment

User = get_user_model()


def make_user(username, role='student', **kwargs):
    return User.objects.create_user(username=username, password='testpass123', role=role, **kwargs)


class LessonUnlockTests(APITestCase):
    """
    The single most important invariant in the platform: a student can
    only get a video token for a lesson at or before their
    unlocked_lesson_order — never beyond it, and never without an
    enrollment at all.
    """

    def setUp(self):
        self.student = make_user('alice', role='student')
        self.course = Course.objects.create(title='English Basics', price=0)
        self.lesson_1 = Lesson.objects.create(course=self.course, title='Intro', order=1, content_url='/media/l1.m3u8')
        self.lesson_2 = Lesson.objects.create(course=self.course, title='Greetings', order=2, content_url='/media/l2.m3u8')
        self.lesson_3 = Lesson.objects.create(course=self.course, title='Numbers', order=3, content_url='/media/l3.m3u8')

    def video_token_url(self, lesson):
        return f'/api/courses/lessons/{lesson.id}/video-token/'

    def test_unenrolled_student_cannot_get_a_token_for_any_lesson(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(self.video_token_url(self.lesson_1))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enrolled_student_can_access_unlocked_lesson(self):
        Enrollment.objects.create(student=self.student, course=self.course, unlocked_lesson_order=1)
        self.client.force_authenticate(self.student)
        response = self.client.get(self.video_token_url(self.lesson_1))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_enrolled_student_cannot_access_locked_lesson_ahead_of_progress(self):
        Enrollment.objects.create(student=self.student, course=self.course, unlocked_lesson_order=1)
        self.client.force_authenticate(self.student)
        response = self.client.get(self.video_token_url(self.lesson_3))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unlocking_next_lesson_grants_access_to_it_but_not_further(self):
        enrollment = Enrollment.objects.create(student=self.student, course=self.course, unlocked_lesson_order=1)
        enrollment.unlock_next_lesson()
        self.client.force_authenticate(self.student)

        response_2 = self.client.get(self.video_token_url(self.lesson_2))
        self.assertEqual(response_2.status_code, status.HTTP_200_OK)

        response_3 = self.client.get(self.video_token_url(self.lesson_3))
        self.assertEqual(response_3.status_code, status.HTTP_403_FORBIDDEN)

    def test_a_students_token_does_not_work_for_a_different_lesson(self):
        """A signed token is bound to one lesson id — reusing it elsewhere must fail."""
        Enrollment.objects.create(student=self.student, course=self.course, unlocked_lesson_order=3)
        token = issue_video_token(self.student.id, self.lesson_1.id)

        response = self.client.get(f'/api/courses/lessons/{self.lesson_2.id}/verify-token/?token={token}')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data['valid'])

    def test_tampered_token_is_rejected(self):
        """Editing even one character of a signed token must invalidate it —
        this is what stops a student from bumping the embedded lesson id."""
        Enrollment.objects.create(student=self.student, course=self.course, unlocked_lesson_order=1)
        token = issue_video_token(self.student.id, self.lesson_1.id)
        tampered = token[:-1] + ('a' if token[-1] != 'a' else 'b')

        response = self.client.get(f'/api/courses/lessons/{self.lesson_1.id}/verify-token/?token={tampered}')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data['valid'])

    def test_decryption_key_only_released_with_a_valid_token(self):
        Enrollment.objects.create(student=self.student, course=self.course, unlocked_lesson_order=1)
        self.lesson_1.encryption_key = 'deadbeef'
        self.lesson_1.encryption_key_id = 'key-1'
        self.lesson_1.save()

        # No token at all
        response = self.client.get(f'/api/courses/lessons/{self.lesson_1.id}/decryption-key/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Forged/garbage token
        response = self.client.get(f'/api/courses/lessons/{self.lesson_1.id}/decryption-key/?token=not-a-real-token')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Valid token for this exact lesson
        token = issue_video_token(self.student.id, self.lesson_1.id)
        response = self.client.get(f'/api/courses/lessons/{self.lesson_1.id}/decryption-key/?token={token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['key'], 'deadbeef')


class TeacherContentRestrictionTests(APITestCase):
    """Teachers must never reach uploaded video content — only the
    meeting-link-scoped endpoints and their own admin-gated equivalents."""

    def setUp(self):
        self.teacher = make_user('mr_teacher', role='teacher')
        self.student = make_user('bob', role='student')
        self.admin = make_user('the_admin', role='admin')
        self.course = Course.objects.create(title='Programming 101', price=0)
        self.lesson = Lesson.objects.create(
            course=self.course, title='Variables', order=1,
            content_url='/media/secret.m3u8', encryption_key='super-secret-key',
        )

    def test_teacher_meeting_link_endpoint_never_exposes_content_url_or_keys(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get('/api/courses/teacher/lessons/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ('content_url', 'encryption_key', 'encryption_key_id'):
            self.assertNotIn(field, response.data[0])

    def test_teacher_cannot_reach_admin_lesson_endpoint(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get('/api/courses/admin/lessons/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_cannot_patch_admin_lesson_endpoint(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f'/api/courses/admin/lessons/{self.lesson.id}/', {'content_url': '/media/hacked.m3u8'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.content_url, '/media/secret.m3u8')

    def test_student_cannot_reach_admin_or_teacher_lesson_endpoints(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get('/api/courses/admin/lessons/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/courses/teacher/lessons/').status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_reach_both_admin_and_teacher_endpoints(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/courses/admin/lessons/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/courses/teacher/lessons/').status_code, status.HTTP_200_OK)

    def test_duplicate_lesson_order_in_same_course_is_a_clean_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/courses/admin/lessons/', {
            'course': self.course.id, 'title': 'Duplicate order', 'order': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('order', response.data)
