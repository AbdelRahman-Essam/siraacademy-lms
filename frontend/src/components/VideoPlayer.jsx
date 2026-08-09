import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

/**
 * Fetches a short-lived signed token from the backend, then plays the
 * lesson's encrypted HLS stream. Renders a moving watermark with the
 * student's email so any screen recording is traceable back to them.
 *
 * NOTE: this is a real deterrent, not a lock — see the platform spec
 * for why absolute screen-recording prevention isn't possible.
 */
export default function VideoPlayer({ lessonId }) {
  const videoRef = useRef(null)
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' })

  useEffect(() => {
    let hls
    async function loadVideo() {
      try {
        const { data } = await client.get(`/courses/lessons/${lessonId}/video-token/`)
        const video = videoRef.current
        // In production, content_url + token get combined so the segment
        // server / nginx auth_request can validate the token per-request.
        const streamUrl = `${data.content_url}?token=${data.token}`

        if (Hls.isSupported()) {
          hls = new Hls()
          hls.loadSource(streamUrl)
          hls.attachMedia(video)
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl // Safari native HLS
        }
      } catch (err) {
        setError(
          err.response?.status === 403
            ? 'This lesson is locked. Complete the previous lesson to unlock it.'
            : 'Could not load video.'
        )
      }
    }
    loadVideo()
    return () => hls?.destroy()
  }, [lessonId])

  // Move the watermark every few seconds so it can't be easily cropped out.
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: `${10 + Math.random() * 70}%`,
        left: `${10 + Math.random() * 70}%`,
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  if (error) return <p className="text-red-600 text-sm">{error}</p>

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video ref={videoRef} controls className="w-full h-full" controlsList="nodownload" />
      <div
        className="absolute text-white/40 text-xs pointer-events-none select-none transition-all duration-1000"
        style={{ top: watermarkPos.top, left: watermarkPos.left }}
      >
        {user?.email || user?.username}
      </div>
    </div>
  )
}
