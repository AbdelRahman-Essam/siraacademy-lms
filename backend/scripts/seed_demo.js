// Node port of the original Django `seed_demo` management command.
// Same demo dataset (users, 5 courses x 10 lessons, enrollments, assignments,
// graded submissions) — adapted to the new embedded Course/Lesson schema and
// the top-level Enrollment/StudentSubmission collections (see
// platform-specification-v2.md section 5 for why those stayed separate).
//
// Usage:
//   npm run seed            # create/update demo data
//   npm run seed -- --reset # delete demo data first, then recreate

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const StudentSubmission = require("../models/StudentSubmission");

const RESET = process.argv.includes("--reset");

const DEMO_USERNAMES = ["admin", "emma", "james", "ahmed", "sara", "omar", "fatma", "youssef", "mary"];

const USERS = [
  { username: "admin", email: "admin@siraacademy.com", password: "Admin123!", role: "admin" },
  { username: "emma", email: "emma@siraacademy.com", password: "Teacher123!", role: "teacher" },
  { username: "james", email: "james@siraacademy.com", password: "Teacher123!", role: "teacher" },
  { username: "ahmed", email: "ahmed@student.com", password: "Student123!", role: "student" },
  { username: "sara", email: "sara@student.com", password: "Student123!", role: "student" },
  { username: "omar", email: "omar@student.com", password: "Student123!", role: "student" },
  { username: "fatma", email: "fatma@student.com", password: "Student123!", role: "student" },
  { username: "youssef", email: "youssef@student.com", password: "Student123!", role: "student" },
  { username: "mary", email: "mary@student.com", password: "Student123!", role: "student" },
];

const COURSES = {
  "English Beginner (A1)": [
    "Greetings and Introductions", "Numbers and Time", "Family Members", "Daily Routine",
    "Food and Drinks", "Shopping", "At the Restaurant", "Directions", "Weather", "Final Speaking Assessment",
  ],
  "English Elementary (A2)": [
    "Past Simple", "Future Plans", "Travel", "Health", "Jobs",
    "Education", "Technology", "Nature", "Culture", "Speaking Assessment",
  ],
  "English Pre-Intermediate (B1)": [
    "Present Perfect", "Storytelling", "Debate Skills", "News Articles", "Email Writing",
    "Giving Opinions", "Problem Solving", "Public Speaking", "Business English", "Midterm Interview",
  ],
  "English Intermediate (B2)": [
    "Advanced Grammar", "Idioms", "Formal Writing", "Meetings", "Negotiation",
    "Academic Reading", "Presentations", "Critical Thinking", "Business Communication", "Final Presentation",
  ],
  "IELTS Preparation": [
    "IELTS Overview", "Listening", "Reading", "Writing Task 1", "Writing Task 2",
    "Speaking Part 1", "Speaking Part 2", "Speaking Part 3", "Full Mock Test", "Final Exam",
  ],
};

const INSTRUCTIONS = [
  "Introduce yourself in English.", "Read today's dialogue aloud.", "Describe your daily routine.",
  "Talk about your family.", "Describe your favorite meal.", "Order food in a restaurant.",
  "Describe your hometown.", "Talk about your hobbies.", "Give your opinion on the lesson.",
  "Complete the final speaking task.",
];

const ENROLLMENTS = [
  { username: "ahmed", course: "English Beginner (A1)", unlockedLessonOrder: 4 },
  { username: "sara", course: "English Beginner (A1)", unlockedLessonOrder: 10 },
  { username: "sara", course: "English Elementary (A2)", unlockedLessonOrder: 3 },
  { username: "omar", course: "English Pre-Intermediate (B1)", unlockedLessonOrder: 2 },
  { username: "fatma", course: "English Intermediate (B2)", unlockedLessonOrder: 6 },
  { username: "youssef", course: "IELTS Preparation", unlockedLessonOrder: 5 },
  { username: "mary", course: "English Elementary (A2)", unlockedLessonOrder: 1 },
];

const FEEDBACK = ["Excellent pronunciation.", "Very fluent speaking.", "Good vocabulary.", "Speak a little slower.", "Work on the TH sound."];
const GRADES = ["95", "92", "88", "84", "79"];

async function run() {
  await connectDB();

  if (RESET) {
    console.log("Removing demo data...");
    await StudentSubmission.deleteMany({});
    await Enrollment.deleteMany({});
    await Course.deleteMany({ title: { $in: Object.keys(COURSES) } });
    await User.deleteMany({ username: { $in: DEMO_USERNAMES } });
  }

  console.log("Creating users...");
  const userByUsername = {};
  for (const u of USERS) {
    let user = await User.findOne({ username: u.username });
    if (!user) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      user = await User.create({ username: u.username, email: u.email, passwordHash, role: u.role });
      console.log(`  created ${u.username}`);
    }
    userByUsername[u.username] = user;
  }

  console.log("Creating courses...");
  const courseByTitle = {};
  for (const [title, lessonTitles] of Object.entries(COURSES)) {
    let course = await Course.findOne({ title });
    if (!course) {
      const lessons = lessonTitles.map((lessonTitle, i) => ({
        title: lessonTitle,
        order: i + 1,
        meetingLink: "https://meet.google.com/demo-class",
        encryptionKeyId: "demo-key-id",
        encryptionKey: "demo-encryption-key",
        segments: [],
        attachments: [],
        assignment: { audioPromptUrl: "demo://prompt.txt", instructions: INSTRUCTIONS[i % INSTRUCTIONS.length] },
      }));
      course = await Course.create({
        title,
        description: `${title} course for Sira English Academy.`,
        lessons,
      });
      console.log(`  created ${title} (${lessons.length} lessons)`);
    }
    courseByTitle[title] = course;
  }

  console.log("Creating enrollments...");
  const enrollmentDocs = [];
  for (const e of ENROLLMENTS) {
    const doc = await Enrollment.findOneAndUpdate(
      { student: userByUsername[e.username]._id, course: courseByTitle[e.course]._id },
      { $setOnInsert: { source: "admin", unlockedLessonOrder: e.unlockedLessonOrder } },
      { upsert: true, new: true }
    );
    enrollmentDocs.push(doc);
  }
  console.log(`  ${enrollmentDocs.length} enrollments ready`);

  console.log("Creating graded student submissions...");
  let submissionCount = 0;
  for (const enrollment of enrollmentDocs) {
    const course = await Course.findById(enrollment.course);
    const unlockedLessons = course.lessons
      .filter((l) => l.order <= enrollment.unlockedLessonOrder)
      .sort((a, b) => a.order - b.order);

    for (let i = 0; i < unlockedLessons.length; i++) {
      const lesson = unlockedLessons[i];
      if (!lesson.assignment) continue;
      try {
        await StudentSubmission.create({
          student: enrollment.student,
          course: course._id,
          lessonId: lesson._id,
          assignmentId: lesson.assignment._id,
          audioFileUrl: "demo://submission.txt",
          status: "graded",
          teacherFeedback: FEEDBACK[i % FEEDBACK.length],
          grade: GRADES[i % GRADES.length],
        });
        submissionCount++;
      } catch (err) {
        if (err.code !== 11000) throw err; // already submitted — fine on re-run
      }
    }
  }

  const counts = {
    users: await User.countDocuments(),
    courses: await Course.countDocuments(),
    lessons: (await Course.find().select("lessons")).reduce((sum, c) => sum + c.lessons.length, 0),
    enrollments: await Enrollment.countDocuments(),
    submissions: await StudentSubmission.countDocuments(),
  };

  console.log("");
  console.log("=".repeat(60));
  console.log("SIRA ENGLISH DEMO CREATED");
  console.log("=".repeat(60));
  console.log(`Users         : ${counts.users}`);
  console.log(`Courses       : ${counts.courses}`);
  console.log(`Lessons       : ${counts.lessons}`);
  console.log(`Enrollments   : ${counts.enrollments}`);
  console.log(`Submissions   : ${counts.submissions} (${submissionCount} created this run)`);
  console.log("=".repeat(60));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
