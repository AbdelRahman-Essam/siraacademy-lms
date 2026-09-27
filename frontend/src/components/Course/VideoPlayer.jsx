import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import api from "../../api/client";

// Fetches the video token, loads the (server-rewritten) HLS playlist, and
// renders a rotating watermark with the student's identity — deters sharing
// by making a leak traceable, per the original spec's design.
export default function VideoPlayer({ courseId, lessonId, studentLabel }) {
  const videoRef = useRef(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: "10%", left: "10%" });

  useEffect(() => {
    let hls;
    (async () => {
      const { data } = await api.get(`/lessons/${courseId}/${lessonId}/token`);
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(data.playlistUrl);
        hls.attachMedia(videoRef.current);
      } else {
        videoRef.current.src = data.playlistUrl;
      }
    })();

    const interval = setInterval(() => {
      setWatermarkPos({ top: `${Math.random() * 70 + 5}%`, left: `${Math.random() * 70 + 5}%` });
    }, 8000);

    // Secondary deterrents from the spec — friction, not real security.
    const blockContextMenu = (e) => e.preventDefault();
    videoRef.current?.addEventListener("contextmenu", blockContextMenu);

    return () => {
      hls?.destroy();
      clearInterval(interval);
      videoRef.current?.removeEventListener("contextmenu", blockContextMenu);
    };
  }, [courseId, lessonId]);

  return (
    <div className="relative bg-black rounded overflow-hidden">
      <video ref={videoRef} controls className="w-full" controlsList="nodownload" />
      <div
        className="absolute text-white/50 text-xs font-mono pointer-events-none select-none"
        style={{ top: watermarkPos.top, left: watermarkPos.left }}
      >
        {studentLabel}
      </div>
    </div>
  );
}
