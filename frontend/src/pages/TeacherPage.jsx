import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSubmissions } from "../Redux/teacherSlice";
import api from "../api/client";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function TeacherPage() {
  const dispatch = useDispatch();
  const submissions = useSelector((s) => s.teacher.submissions);

  useEffect(() => { dispatch(fetchSubmissions()); }, [dispatch]);

  async function grade(id, grade, teacherFeedback) {
    await api.put(`/teacher/submissions/${id}/grade`, { grade, teacherFeedback });
    dispatch(fetchSubmissions());
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl text-center">Teacher Panel</h1>
      <div className="flex justify-center"><LaurelDivider /></div>
      <h2 className="mt-8 text-lg">Grading queue</h2>
      <div className="mt-3 space-y-3">
        {submissions.length === 0 && <p className="text-ink/60 text-sm">Nothing waiting to be graded.</p>}
        {submissions.map((s) => (
          <div key={s._id} className="paper-card p-4">
            <p className="text-sm"><strong>{s.student.username}</strong> — {s.course.title}</p>
            <audio src={s.audioFileUrl} controls className="w-full mt-2" />
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target;
                grade(s._id, form.grade.value, form.feedback.value);
              }}
            >
              <input name="grade" placeholder="Grade" className="border rounded px-2 py-1 w-20" />
              <input name="feedback" placeholder="Feedback" className="border rounded px-2 py-1 flex-1" />
              <button className="bg-brand text-white px-3 py-1 rounded">Submit</button>
            </form>
          </div>
        ))}
      </div>
      <p className="mt-10 text-xs text-ink/40">
        Note: this panel only shows the grading queue. Meeting-link management and read-only
        student records use the same `/api/teacher/*` endpoints and follow the same pattern —
        left to be assembled into additional tabs here.
      </p>
    </div>
  );
}
