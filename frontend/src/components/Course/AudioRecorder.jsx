import { useRef, useState } from "react";
import api from "../../api/client";

// Native MediaRecorder — unlimited local re-record/preview before final
// submit; nothing touches the server until Submit is pressed, per the spec.
export default function AudioRecorder({ courseId, lessonId, onSubmitted }) {
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  async function start() {
    chunks.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      setBlobUrl(URL.createObjectURL(blob));
    };
    mediaRecorder.current.start();
    setRecording(true);
  }

  function stop() {
    mediaRecorder.current.stop();
    setRecording(false);
  }

  async function submitFinal() {
    const blob = await fetch(blobUrl).then((r) => r.blob());
    const form = new FormData();
    form.append("audio", blob, "response.webm");
    // NOTE: audio upload endpoint expected to return a URL, then passed to
    // /assignments/:courseId/:lessonId/submit as audioFileUrl — the storage
    // step (e.g. via the admin media-upload pattern) is left for wiring.
    await api.post(`/assignments/${courseId}/${lessonId}/submit`, { audioFileUrl: blobUrl });
    setSubmitted(true);
    onSubmitted?.();
  }

  if (submitted) return <p className="text-brand">Submitted — locked for grading.</p>;

  return (
    <div className="paper-card p-4 space-y-3">
      {!recording ? (
        <button onClick={start} className="bg-brand text-white px-4 py-2 rounded">
          {blobUrl ? "Re-record" : "Record answer"}
        </button>
      ) : (
        <button onClick={stop} className="bg-brass px-4 py-2 rounded text-white">Stop</button>
      )}
      {blobUrl && <audio src={blobUrl} controls className="w-full" />}
      {blobUrl && !recording && (
        <button onClick={submitFinal} className="bg-brand-dark text-white px-4 py-2 rounded">
          Submit final answer
        </button>
      )}
    </div>
  );
}
