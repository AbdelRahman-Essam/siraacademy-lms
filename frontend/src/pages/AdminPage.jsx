import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllEnrollments, uploadLessonVideo } from "../Redux/adminSlice";
import api from "../api/client";
import UploadProgressBar from "../components/Admin/UploadProgressBar";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function AdminPage() {
  const dispatch = useDispatch();
  const enrollments = useSelector((s) => s.admin.enrollments);
  const accessToken = useSelector((s) => s.user.accessToken);
  const [storageAccounts, setStorageAccounts] = useState([]);
  const [newAccountLabel, setNewAccountLabel] = useState("");

  useEffect(() => {
    dispatch(fetchAllEnrollments());
    api.get("/admin/storage-accounts").then((r) => setStorageAccounts(r.data));
  }, [dispatch]);

  function connectGoogleAccount() {
    const label = encodeURIComponent(newAccountLabel || "Untitled account");
    // Direct browser navigation (not an axios call) — the OAuth consent
    // screen has to happen in the top-level window, so the access token is
    // passed as a query param rather than an Authorization header. See
    // controllers/driveOAuth.controller.js for why.
    window.location.href = `/api/admin/drive/oauth/start?label=${label}&token=${accessToken}`;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
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
          {storageAccounts.map((a) => (
            <li key={a._id}>{a.label} — {a.ownerEmail}</li>
          ))}
          {storageAccounts.length === 0 && <li className="text-ink/40">No accounts connected yet.</li>}
        </ul>
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Label (e.g. 'Course storage #1')"
            value={newAccountLabel}
            onChange={(e) => setNewAccountLabel(e.target.value)}
          />
          <button onClick={connectGoogleAccount} className="bg-brass text-white px-3 py-1 rounded">
            Connect Google account
          </button>
        </div>
      </section>

      <section className="paper-card p-4">
        <h2 className="text-lg mb-3">Upload lesson video</h2>
        <p className="text-xs text-ink/50 mb-3">
          Requires a course and lesson id, and that course's storage account to already be connected above.
        </p>
        <VideoUploadForm />
        <div className="mt-3"><UploadProgressBar /></div>
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
        Course/lesson creation and editing, and attachment uploads, use the same `/api/admin/*`
        endpoints as this page and follow the same pattern — left to be assembled into additional
        tabs here as the next step.
      </p>
    </div>
  );
}

function VideoUploadForm() {
  const dispatch = useDispatch();
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [file, setFile] = useState(null);

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (file) dispatch(uploadLessonVideo(courseId, lessonId, file));
      }}
    >
      <input className="border rounded px-2 py-1" placeholder="Course ID" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
      <input className="border rounded px-2 py-1" placeholder="Lesson ID" value={lessonId} onChange={(e) => setLessonId(e.target.value)} />
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
      <button className="bg-brand text-white px-3 py-1 rounded">Upload</button>
    </form>
  );
}
