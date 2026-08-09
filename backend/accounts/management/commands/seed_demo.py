from enrollments.models import Enrollment
from assignments.models import Assignment, StudentSubmission
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from courses.models import Course, Lesson

User = get_user_model()


class Command(BaseCommand):
	help = "Seed Sira English demo academy"

	def add_arguments(self, parser):
		parser.add_argument(
			"--reset",
			action="store_true",
			help="Delete demo data before recreating it.",
		)

	def handle(self, *args, **options):

		if options["reset"]:
			self.stdout.write("Removing demo data...")
			StudentSubmission.objects.all().delete()
			Assignment.objects.all().delete()
			Enrollment.objects.all().delete()
			Lesson.objects.all().delete()
			Course.objects.all().delete()

			User.objects.filter(
				username__in=[
					"admin",
					"emma",
					"james",
					"ahmed",
					"sara",
					"omar",
					"fatma",
					"youssef",
					"mary",
				]
			).delete()

		self.stdout.write(self.style.SUCCESS("Creating users..."))

		users = [
			{
				"username": "admin",
				"email": "admin@siraacademy.com",
				"password": "Admin123!",
				"role": "admin",
				"first_name": "System",
				"last_name": "Administrator",
				"is_staff": True,
				"is_superuser": True,
			},
			{
				"username": "emma",
				"email": "emma@siraacademy.com",
				"password": "Teacher123!",
				"role": "teacher",
				"first_name": "Emma",
				"last_name": "Johnson",
			},
			{
				"username": "james",
				"email": "james@siraacademy.com",
				"password": "Teacher123!",
				"role": "teacher",
				"first_name": "James",
				"last_name": "Brown",
			},
			{
				"username": "ahmed",
				"email": "ahmed@student.com",
				"password": "Student123!",
				"role": "student",
				"first_name": "Ahmed",
				"last_name": "Ali",
			},
			{
				"username": "sara",
				"email": "sara@student.com",
				"password": "Student123!",
				"role": "student",
				"first_name": "Sara",
				"last_name": "Mohamed",
			},
			{
				"username": "omar",
				"email": "omar@student.com",
				"password": "Student123!",
				"role": "student",
				"first_name": "Omar",
				"last_name": "Hassan",
			},
			{
				"username": "fatma",
				"email": "fatma@student.com",
				"password": "Student123!",
				"role": "student",
				"first_name": "Fatma",
				"last_name": "Ibrahim",
			},
			{
				"username": "youssef",
				"email": "youssef@student.com",
				"password": "Student123!",
				"role": "student",
				"first_name": "Youssef",
				"last_name": "Mahmoud",
			},
			{
				"username": "mary",
				"email": "mary@student.com",
				"password": "Student123!",
				"role": "student",
				"first_name": "Mary",
				"last_name": "Nabil",
			},
		]

		for item in users:

			username = item.pop("username")
			password = item.pop("password")

			user, created = User.objects.get_or_create(
				username=username,
				defaults=item,
			)

			if created:
				user.set_password(password)
				user.is_staff = item.get("is_staff", False)
				user.is_superuser = item.get("is_superuser", False)
				user.save()

				self.stdout.write(
					self.style.SUCCESS(f"Created user: {username}")
				)

		self.stdout.write(self.style.SUCCESS("Creating courses..."))

		courses = {
			"English Beginner (A1)": [
				"Greetings and Introductions",
				"Numbers and Time",
				"Family Members",
				"Daily Routine",
				"Food and Drinks",
				"Shopping",
				"At the Restaurant",
				"Directions",
				"Weather",
				"Final Speaking Assessment",
			],
			"English Elementary (A2)": [
				"Past Simple",
				"Future Plans",
				"Travel",
				"Health",
				"Jobs",
				"Education",
				"Technology",
				"Nature",
				"Culture",
				"Speaking Assessment",
			],
			"English Pre-Intermediate (B1)": [
				"Present Perfect",
				"Storytelling",
				"Debate Skills",
				"News Articles",
				"Email Writing",
				"Giving Opinions",
				"Problem Solving",
				"Public Speaking",
				"Business English",
				"Midterm Interview",
			],
			"English Intermediate (B2)": [
				"Advanced Grammar",
				"Idioms",
				"Formal Writing",
				"Meetings",
				"Negotiation",
				"Academic Reading",
				"Presentations",
				"Critical Thinking",
				"Business Communication",
				"Final Presentation",
			],
			"IELTS Preparation": [
				"IELTS Overview",
				"Listening",
				"Reading",
				"Writing Task 1",
				"Writing Task 2",
				"Speaking Part 1",
				"Speaking Part 2",
				"Speaking Part 3",
				"Full Mock Test",
				"Final Exam",
			],
		}

		for course_title, lessons in courses.items():

			course = Course.objects.create(
				title=course_title,
				description=f"{course_title} course for Sira English Academy.",
			)

			self.stdout.write(f"Created course: {course.title}")

			for order, lesson_title in enumerate(lessons, start=1):

				Lesson.objects.create(
					course=course,
					order=order,
					title=lesson_title,
					content_url=f"/media/videos/{course.id}/lesson{order}/master.m3u8",
					meeting_link="https://meet.google.com/demo-class",
					encryption_key_id="demo-key-id",
					encryption_key="demo-encryption-key",
				)
	
		self.stdout.write("")
		self.stdout.write(self.style.SUCCESS("Creating enrollments..."))

		users = {u.username: u for u in User.objects.all()}
		courses = {c.title: c for c in Course.objects.all()}

		Enrollment.objects.get_or_create(
		student=users["ahmed"],
		course=courses["English Beginner (A1)"],
		defaults={"unlocked_lesson_order": 4},
		)

		Enrollment.objects.get_or_create(
				student=users["sara"],
				course=courses["English Beginner (A1)"],
				defaults={"unlocked_lesson_order": 10},
		)

		Enrollment.objects.get_or_create(
				student=users["sara"],
				course=courses["English Elementary (A2)"],
				defaults={"unlocked_lesson_order": 3},
		)

		Enrollment.objects.get_or_create(
				student=users["omar"],
				course=courses["English Pre-Intermediate (B1)"],
				defaults={"unlocked_lesson_order": 2},
		)

		Enrollment.objects.get_or_create(
				student=users["fatma"],
				course=courses["English Intermediate (B2)"],
				defaults={"unlocked_lesson_order": 6},
		)

		Enrollment.objects.get_or_create(
				student=users["youssef"],
				course=courses["IELTS Preparation"],
				defaults={"unlocked_lesson_order": 5},
		)

		Enrollment.objects.get_or_create(
				student=users["mary"],
				course=courses["English Elementary (A2)"],
				defaults={"unlocked_lesson_order": 1},
		)

		self.stdout.write(self.style.SUCCESS("Enrollments created."))
		
		self.stdout.write("")
		self.stdout.write(self.style.SUCCESS("Creating assignments..."))

		instructions = [
			"Introduce yourself in English.",
			"Read today's dialogue aloud.",
			"Describe your daily routine.",
			"Talk about your family.",
			"Describe your favorite meal.",
			"Order food in a restaurant.",
			"Describe your hometown.",
			"Talk about your hobbies.",
			"Give your opinion on the lesson.",
			"Complete the final speaking task.",
		]

		for lesson in Lesson.objects.all():

			assignment = Assignment.objects.create(
				lesson=lesson,
				instructions=instructions[(lesson.order - 1) % len(instructions)],
			)

			assignment.audio_prompt.save(
				f"prompt_{lesson.id}.txt",
				ContentFile(b"Demo audio prompt"),
				save=True,
			)

		self.stdout.write(self.style.SUCCESS("Assignments created."))

		self.stdout.write("")
		self.stdout.write(self.style.SUCCESS("Creating student submissions..."))

		feedback = [
				"Excellent pronunciation.",
				"Very fluent speaking.",
				"Good vocabulary.",
				"Speak a little slower.",
				"Work on the TH sound.",
		]

		grades = ["95", "92", "88", "84", "79"]

		students = [
			users["ahmed"],
				users["sara"],
				users["omar"],
				users["fatma"],
				users["youssef"],
		]

		for student in students:

			enrollments = Enrollment.objects.filter(student=student)

			for enrollment in enrollments:

				lessons = enrollment.course.lessons.filter(
						order__lte=enrollment.unlocked_lesson_order
				)

				for index, lesson in enumerate(lessons):

						assignment = lesson.assignments.first()

						submission = StudentSubmission.objects.create(
							student=student,
							assignment=assignment,
							status=StudentSubmission.Status.GRADED,
							teacher_feedback=feedback[index % len(feedback)],
							grade=grades[index % len(grades)],
						)

						submission.audio_file.save(
							f"{student.username}_{lesson.id}.txt",
							ContentFile(b"Demo student recording"),
							save=True,
						)

		self.stdout.write(self.style.SUCCESS("Student submissions created."))


		self.stdout.write("")
		self.stdout.write(self.style.SUCCESS("=" * 60))
		self.stdout.write(self.style.SUCCESS("SIRA ENGLISH DEMO CREATED"))
		self.stdout.write(self.style.SUCCESS("=" * 60))

		self.stdout.write(f"Users         : {User.objects.count()}")
		self.stdout.write(f"Courses       : {Course.objects.count()}")
		self.stdout.write(f"Lessons       : {Lesson.objects.count()}")
		self.stdout.write(f"Enrollments   : {Enrollment.objects.count()}")
		self.stdout.write(f"Assignments   : {Assignment.objects.count()}")
		self.stdout.write(f"Submissions   : {StudentSubmission.objects.count()}")

		self.stdout.write(self.style.SUCCESS("=" * 60))
