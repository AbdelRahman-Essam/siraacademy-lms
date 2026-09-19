from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from courses.models import Course, Lesson
from enrollments.models import Enrollment

User = get_user_model()


def make_user(username, role='student', **kwargs):
    return User.objects.create_user(username=username, password='testpass123', role=role, **kwargs)


class SelfEnrollTests(APITestCase):
    """The self-enroll endpoint must only ever work for free courses —
    this is what stops a paid course from being obtained without paying,
    by simply calling the enroll endpoint directly instead of checkout."""

    def setUp(self):
        self.student = make_user('alice')
        self.free_course = Course.objects.create(title='Free Intro', price=0)
        self.paid_course = Course.objects.create(title='Advanced English', price=500)
        self.client.force_authenticate(self.student)

    def test_self_enroll_works_for_free_course(self):
        response = self.client.post('/api/enrollments/enroll/', {'course_id': self.free_course.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        enrollment = Enrollment.objects.get(student=self.student, course=self.free_course)
        self.assertEqual(enrollment.source, Enrollment.Source.SELF)
        self.assertEqual(enrollment.unlocked_lesson_order, 1)

    def test_self_enroll_rejects_paid_course(self):
        response = self.client.post('/api/enrollments/enroll/', {'course_id': self.paid_course.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Enrollment.objects.filter(student=self.student, course=self.paid_course).exists())

    def test_cannot_self_enroll_twice_in_the_same_course(self):
        self.client.post('/api/enrollments/enroll/', {'course_id': self.free_course.id})
        response = self.client.post('/api/enrollments/enroll/', {'course_id': self.free_course.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Enrollment.objects.filter(student=self.student, course=self.free_course).count(), 1)

    def test_unauthenticated_request_is_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/enrollments/enroll/', {'course_id': self.free_course.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdminEnrollTests(APITestCase):
    """Admin-driven enrollment is today's primary path for paid courses —
    it must work for admins only, and must record source='admin'."""

    def setUp(self):
        self.admin = make_user('the_admin', role='admin')
        self.teacher = make_user('mr_teacher', role='teacher')
        self.student = make_user('bob')
        self.course = Course.objects.create(title='Programming 101', price=300)

    def test_admin_can_enroll_any_student(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/enrollments/admin/enroll/', {
            'username': self.student.username, 'course_id': self.course.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        enrollment = Enrollment.objects.get(student=self.student, course=self.course)
        self.assertEqual(enrollment.source, Enrollment.Source.ADMIN)

    def test_teacher_cannot_enroll_students(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post('/api/enrollments/admin/enroll/', {
            'username': self.student.username, 'course_id': self.course.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_enroll_other_students(self):
        other_student = make_user('carol')
        self.client.force_authenticate(self.student)
        response = self.client.post('/api/enrollments/admin/enroll/', {
            'username': other_student.username, 'course_id': self.course.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enrolling_unknown_username_returns_404_not_500(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/enrollments/admin/enroll/', {
            'username': 'does-not-exist', 'course_id': self.course.id,
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class UnlockNextLessonTests(APITestCase):
    def setUp(self):
        self.student = make_user('alice')
        self.other_student = make_user('mallory')
        self.course = Course.objects.create(title='English Basics', price=0)
        Lesson.objects.create(course=self.course, title='Intro', order=1)
        Lesson.objects.create(course=self.course, title='Greetings', order=2)
        self.enrollment = Enrollment.objects.create(student=self.student, course=self.course, unlocked_lesson_order=1)

    def test_owner_can_unlock_next_lesson(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(f'/api/enrollments/{self.enrollment.id}/unlock-next/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.unlocked_lesson_order, 2)

    def test_unlock_does_not_go_past_the_last_lesson(self):
        self.enrollment.unlocked_lesson_order = 2
        self.enrollment.save()
        self.client.force_authenticate(self.student)
        self.client.post(f'/api/enrollments/{self.enrollment.id}/unlock-next/')
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.unlocked_lesson_order, 2)

    def test_a_student_cannot_unlock_another_students_enrollment(self):
        self.client.force_authenticate(self.other_student)
        response = self.client.post(f'/api/enrollments/{self.enrollment.id}/unlock-next/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
