import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllEnrollments, fetchAdminCourses, fetchAdminCourse, fetchStorageAccounts, deleteCourse,
} from "../Redux/adminSlice";
import CourseForm from "../components/Admin/CourseForm";
import LessonManager from "../components/Admin/LessonManager";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function AdminPage() {
  const dispatch = useDispatch();
  const enrollments = useSelector((s) => s.admin.enrollments);
  const courses = useSelector((s) => s.admin.courses);
  const currentCourse = useSelector((s) => s.admin.currentCourse);
  const storageAccounts = useSelector((s) => s.admin.storageAccounts);
  const accessToken = useSelector((s) => s.user.accessToken);

  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState("");

  useEffect(() => {
    dispatch(fetchAllEnrollments());
    dispatch(fetchAdminCourses());
    dispatch(fetchStorageAccounts());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCourseId) dispatch(fetchAdminCourse(selectedCourseId));
  }, [dispatch, selectedCourseId]);

  function connectGoogleAccount() {
    const label = encodeURIComponent(newAccountLabel || "Untitled account");
    // Direct browser navigation — can't carry an Authorization header, so the
    // access token is passed as a query param instead. See
    // controllers/driveOAuth.controller.js for why.
    window.location.href = `/api/admin/drive/oauth/start?label=${label}&token=${accessToken}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-3xl text-center">Admin Dashboard</h1>
        <div className="flex justify-center"><LaurelDivider /></div>
      </div>

      <section className="paper-card p-4">
        <h2 className="text-lg mb-3">Google Drive storage accounts</h2>
        <p className="text-xs text-ink/50 mb-3">
          Each course can use a different Google account to spread video storage across free 15GB tiers.
        </p>
        <ul className="text-sm space-y-1 mb-3">
          {storageAccounts.map((a) => <li key={a._id}>{a.label} — {a.ownerEmail}</li>)}
          {storageAccounts.length === 0 && <li className="text-ink/40">No accounts connected yet.</li>}
        </ul>
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" placeholder="Label (e.g. 'Course storage #1')"
            value={newAccountLabel} onChange={(e) => setNewAccountLabel(e.target.value)} />
          <button onClick={connectGoogleAccount} className="bg-brass text-white px-3 py-1 rounded">
            Connect Google account
          </button>
        </div>
      </section>

      <section className="paper-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg">Courses</h2>
          <button onClick={() => { setCreatingCourse(!creatingCourse); setSelectedCourseId(null); }} className="text-brand underline text-sm">
            {creatingCourse ? "Cancel" : "+ New course"}
          </button>
        </div>

        {creatingCourse && (
          <div className="border rounded p-3 mb-4">
            <CourseForm onSaved={() => setCreatingCourse(false)} />
          </div>
        )}

        <ul className="divide-y">
          {courses.map((c) => (
            <li key={c._id} className="py-2">
              <div className="flex items-center justify-between">
                <button onClick={() => setSelectedCourseId(selectedCourseId === c._id ? null : c._id)} className="text-left hover:text-brand">
                  <strong>{c.title}</strong>
                  <span className="text-xs text-ink/50 ml-2">
                    {c.price > 0 ? `${c.price} EGP${c.discountPercent ? ` (−${c.discountPercent}%)` : ""}` : "Free"} · {c.lessons.length} lessons
                  </span>
                </button>
                <button onClick={() => dispatch(deleteCourse(c._id))} className="text-red-600 text-xs underline">Delete course</button>
              </div>

              {selectedCourseId === c._id && currentCourse?._id === c._id && (
                <div className="mt-4 pl-2 border-l-2 space-y-4">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand">Edit course details & pricing</summary>
                    <div className="mt-2"><CourseForm course={currentCourse} /></div>
                  </details>
                  <div>
                    <h3 className="text-sm uppercase tracking-wide text-ink/50 mb-2">Lessons</h3>
                    <LessonManager course={currentCourse} />
                  </div>
                </div>
              )}
            </li>
          ))}
          {courses.length === 0 && <li className="text-ink/40 text-sm py-2">No courses yet — create one above.</li>}
        </ul>
      </section>

      <section className="paper-card p-4">
        <h2 className="text-lg mb-3">Enrollments ({enrollments.length})</h2>
        <ul className="text-sm space-y-1">
          {enrollments.map((e) => (
            <li key={e._id}>{e.student?.username} → {e.course?.title} (unlocked through lesson {e.unlockedLessonOrder})</li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-ink/40">
        Teacher-side meeting-link management and read-only student records use the same
        `/api/teacher/*` endpoints and follow the same pattern as the Teacher page's grading
        queue — left to be assembled into additional tabs there.
      </p>
    </div>
  );
}
