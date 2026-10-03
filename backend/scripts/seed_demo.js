// Node port of the original Django `seed_demo` management command.
// Same demo dataset (users, 5 courses x 10 lessons, enrollments, assignments,
// graded submissions), now written against PostgreSQL.
//
// Usage:
//   npm run seed            # create/update demo data
//   npm run seed -- --reset # delete demo data first, then recreate

require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Users = require("../models/users");
const Enrollments = require("../models/enrollments");
const Submissions = require("../models/submissions");
const q = connectDB.query;

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
    await q("DELETE FROM student_submissions");
    await q("DELETE FROM enrollments");
    await q("DELETE FROM courses WHERE title = ANY($1)", [Object.keys(COURSES)]); // lessons cascade
    await q("DELETE FROM users WHERE username = ANY($1)", [DEMO_USERNAMES]);
  }

  console.log("Creating users...");
  const userByUsername = {};
  for (const u of USERS) {
    let user = await Users.findByUsername(u.username);
    if (!user) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      user = await Users.create({ username: u.username, email: u.email, passwordHash, role: u.role });
      console.log(`  created ${u.username}`);
    }
    userByUsername[u.username] = user;
  }

  console.log("Creating courses...");
  const courseIdByTitle = {};
  for (const [title, lessonTitles] of Object.entries(COURSES)) {
    const existing = await q("SELECT id FROM courses WHERE title = $1 LIMIT 1", [title]);
    if (existing.rows[0]) {
      courseIdByTitle[title] = existing.rows[0].id;
      continue;
    }
    const { rows } = await q("INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING id", [
      title,
      `${title} course for Sira English Academy.`,
    ]);
    const courseId = rows[0].id;
    for (let i = 0; i < lessonTitles.length; i++) {
      const lesson = await q(
        `INSERT INTO lessons (course_id, title, lesson_order, meeting_link, encryption_key_id, encryption_key)
         VALUES ($1, $2, $3, 'https://meet.google.com/demo-class', 'demo-key-id', 'demo-encryption-key')
         RETURNING id`,
        [courseId, lessonTitles[i], i + 1]
      );
      await q("INSERT INTO assignments (lesson_id, audio_prompt_url, instructions) VALUES ($1, 'demo://prompt.txt', $2)", [
        lesson.rows[0].id,
        INSTRUCTIONS[i % INSTRUCTIONS.length],
      ]);
    }
    courseIdByTitle[title] = courseId;
    console.log(`  created ${title} (${lessonTitles.length} lessons)`);
  }

  console.log("Creating enrollments...");
  const enrollments = [];
  for (const e of ENROLLMENTS) {
    enrollments.push(
      await Enrollments.ensure(userByUsername[e.username]._id, courseIdByTitle[e.course], {
        source: "admin",
        unlockedLessonOrder: e.unlockedLessonOrder,
      })
    );
  }
  console.log(`  ${enrollments.length} enrollments ready`);

  console.log("Creating graded student submissions...");
  let submissionCount = 0;
  for (const enrollment of enrollments) {
    const { rows: unlocked } = await q(
      `SELECT l.id AS lesson_id, a.id AS assignment_id
         FROM lessons l JOIN assignments a ON a.lesson_id = l.id
        WHERE l.course_id = $1 AND l.lesson_order <= $2
        ORDER BY l.lesson_order`,
      [enrollment.course, enrollment.unlockedLessonOrder]
    );

    for (let i = 0; i < unlocked.length; i++) {
      try {
        await Submissions.create({
          studentId: enrollment.student,
          courseId: enrollment.course,
          lessonId: unlocked[i].lesson_id,
          assignmentId: unlocked[i].assignment_id,
          audioFileUrl: "demo://submission.txt",
          status: "graded",
          teacherFeedback: FEEDBACK[i % FEEDBACK.length],
          grade: GRADES[i % GRADES.length],
        });
        submissionCount++;
      } catch (err) {
        if (err.code !== "23505") throw err; // already submitted — fine on re-run
      }
    }
  }

  const scalar = async (sql) => (await q(sql)).rows[0].n;
  const counts = {
    users: await Users.count(),
    courses: await scalar("SELECT count(*)::int AS n FROM courses"),
    lessons: await scalar("SELECT count(*)::int AS n FROM lessons"),
    enrollments: await scalar("SELECT count(*)::int AS n FROM enrollments"),
    submissions: await Submissions.count(),
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

  await connectDB.pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
