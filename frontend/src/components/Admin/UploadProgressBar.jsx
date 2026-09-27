import { useSelector } from "react-redux";

const LABELS = {
  uploading_to_server: "Uploading to server…",
  encrypting: "Encrypting (FFmpeg + Shaka Packager)…",
  creating_drive_folder: "Creating lesson folder on Drive…",
  uploading_to_drive: "Uploading encrypted segments to Drive…",
  done: "Done",
  error: "Upload failed",
};

export default function UploadProgressBar() {
  const progress = useSelector((s) => s.admin.uploadProgress);
  if (!progress) return null;

  return (
    <div className="paper-card p-4">
      <p className="text-sm mb-2">{LABELS[progress.status] || progress.status}</p>
      <div className="w-full bg-parchment-dark rounded h-2 overflow-hidden">
        <div
          className={`h-2 rounded ${progress.status === "error" ? "bg-red-500" : "bg-brass"}`}
          style={{ width: `${progress.percent ?? (progress.status === "done" ? 100 : 0)}%` }}
        />
      </div>
      {progress.status === "error" && <p className="text-red-600 text-xs mt-1">{progress.error}</p>}
    </div>
  );
}
