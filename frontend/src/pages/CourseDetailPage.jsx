import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCourseDetail } from "../Redux/courseSlice";
import VideoPlayer from "../components/Course/VideoPlayer";
import AudioRecorder from "../components/Course/AudioRecorder";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function CourseDetailPage() {
  const { id: courseId } = useParams();
  const dispatch = useDispatch();
  const course = useSelector((s) => s.course.current);
  const user = useSelector((s) => s.user.user);
  const [activeLessonId, setActiveLessonId] = useState(null);

  useEffect(() => { dispatch(fetchCourseDetail(courseId)); }, [dispatch, courseId]);

  if (!course) return <p className="text-center py-10">Loading…</p>;
  const activeLesson = course.lessons.find((l) => l.id === activeLessonId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-[2fr_1fr] gap-8">
      <div>
        <h1 className="text-2xl">{course.title}</h1>
        <LaurelDivider />
        {activeLesson ? (
          !activeLesson.locked ? (
            <div className="mt-6 space-y-6">
              <VideoPlayer courseId={courseId} lessonId={activeLesson.id} studentLabel={user?.username} />
              {activeLesson.meetingLink && (
                <a href={activeLesson.meetingLink} target="_blank" rel="noreferrer" className="text-brand underline text-sm">
                  Join live session
                </a>
              )}
              {activeLesson.hasAssignment && (
                <AudioRecorder courseId={courseId} lessonId={activeLesson.id} />
              )}
            </div>
          ) : (
            <p className="mt-6 text-ink/60">This lesson isn't unlocked yet.</p>
          )
        ) : (
          <p className="mt-6 text-ink/60">Select a lesson to begin.</p>
        )}
      </div>

      <aside className="paper-card p-4 h-fit">
        <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-3">Lessons</h2>
        <ul className="space-y-1">
          {course.lessons.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => setActiveLessonId(l.id)}
                disabled={l.locked}
                className={`w-full text-left px-3 py-2 rounded text-sm ${
                  activeLessonId === l.id ? "bg-brand text-white" : l.locked ? "text-ink/30" : "hover:bg-parchment-dark"
                }`}
              >
                {l.order}. {l.title} {l.locked && "🔒"}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
