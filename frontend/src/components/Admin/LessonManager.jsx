import { useState } from "react";
import { useDispatch } from "react-redux";
import { addLesson, updateLesson, deleteLesson, uploadLessonVideo, addAttachment, uploadMediaFile } from "../../Redux/adminSlice";
import UploadProgressBar from "./UploadProgressBar";

// Lesson list + add/edit form + per-lesson video upload and attachments, for
// one currently-selected course. This replaces the old "type in a Course ID
// and Lesson ID by hand" video upload form.
export default function LessonManager({ course }) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(null); // lesson being edited, or "new"
  const [activeUploadLesson, setActiveUploadLesson] = useState(null);

  const canUploadVideo = !!(course.driveFolderId && course.storageAccount);

  return (
    <div className="space-y-3">
      {!canUploadVideo && (
        <p className="text-xs text-brass-dark bg-parchment-dark rounded px-2 py-1">
          Set this course's Drive folder ID and storage account (above) before uploading lesson video.
        </p>
      )}

      <ul className="space-y-2">
        {course.lessons.sort((a, b) => a.order - b.order).map((lesson) => (
          <li key={lesson._id} className="border rounded p-3">
            {editing === lesson._id ? (
              <LessonForm
                courseId={course._id}
                lesson={lesson}
                onDone={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{lesson.order}. {lesson.title}</p>
                  <p className="text-xs text-ink/50">
                    {lesson.segments?.length || 0} segments uploaded
                    {lesson.meetingLink && " · meeting link set"}
                    {lesson.assignment?.instructions && " · has homework"}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button onClick={() => setEditing(lesson._id)} className="text-brand underline">Edit</button>
                  <button onClick={() => dispatch(deleteLesson(course._id, lesson._id))} className="text-red-600 underline">Delete</button>
                  <button
                    disabled={!canUploadVideo}
                    onClick={() => setActiveUploadLesson(activeUploadLesson === lesson._id ? null : lesson._id)}
                    className="text-brass underline disabled:text-ink/30"
                  >
                    Upload video
                  </button>
                </div>
              </div>
            )}

            {activeUploadLesson === lesson._id && (
              <div className="mt-3 border-t pt-3">
                <VideoUpload courseId={course._id} lessonId={lesson._id} />
              </div>
            )}

            {activeUploadLesson === lesson._id && (
              <div className="mt-3">
                <AttachmentUpload courseId={course._id} lessonId={lesson._id} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <div className="border rounded p-3">
          <LessonForm courseId={course._id} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button onClick={() => setEditing("new")} className="text-brand underline text-sm">+ Add lesson</button>
      )}
    </div>
  );
}

function LessonForm({ courseId, lesson, onDone }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState(lesson?.title || "");
  const [order, setOrder] = useState(lesson?.order || "");
  const [meetingLink, setMeetingLink] = useState(lesson?.meetingLink || "");
  const [instructions, setInstructions] = useState(lesson?.assignment?.instructions || "");

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      title, order: Number(order), meetingLink,
      assignment: instructions ? { instructions, audioPromptUrl: lesson?.assignment?.audioPromptUrl || "" } : undefined,
    };
    if (lesson) await dispatch(updateLesson(courseId, lesson._id, payload));
    else await dispatch(addLesson(courseId, payload));
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input className="w-full border rounded px-2 py-1" placeholder="Lesson title" required
        value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="number" className="w-full border rounded px-2 py-1" placeholder="Order (1, 2, 3…)" required
        value={order} onChange={(e) => setOrder(e.target.value)} />
      <input className="w-full border rounded px-2 py-1" placeholder="Live meeting link (optional)"
        value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
      <textarea className="w-full border rounded px-2 py-1" placeholder="Homework instructions (optional — leave blank for no assignment)" rows={2}
        value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      <div className="flex gap-2">
        <button className="bg-brand text-white px-3 py-1 rounded text-sm">Save</button>
        <button type="button" onClick={onDone} className="text-sm text-ink/50">Cancel</button>
      </div>
    </form>
  );
}

function VideoUpload({ courseId, lessonId }) {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  return (
    <div className="space-y-2">
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
      <button
        disabled={!file}
        onClick={() => dispatch(uploadLessonVideo(courseId, lessonId, file))}
        className="bg-brass text-white px-3 py-1 rounded text-sm disabled:opacity-40"
      >
        Start upload
      </button>
      <UploadProgressBar />
    </div>
  );
}

function AttachmentUpload({ courseId, lessonId }) {
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await dispatch(uploadMediaFile(file, "document"));
    await dispatch(addAttachment(courseId, lessonId, { url, kind: "document", originalFilename: file.name }));
    setUploading(false);
  }

  return (
    <div>
      <label className="text-xs text-ink/50">Attachment (PDF, worksheet, etc.)</label>
      <input type="file" onChange={handleChange} />
      {uploading && <span className="text-xs text-brass ml-2">Uploading…</span>}
    </div>
  );
}
