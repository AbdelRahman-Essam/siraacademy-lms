import { useRef, useState } from 'react'
import client from '../api/client'

/**
 * Lets the student listen to a prompt, record their own voice response,
 * preview it, and re-record as many times as they like — nothing is
 * uploaded until they press "Submit final". Only the last recording is
 * ever sent to the server.
 */
export default function AudioRecorder({ assignmentId, promptUrl }) {
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const [recording, setRecording] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      setError('Microphone access is required to record your answer.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  function reRecord() {
    setPreviewUrl(null)
    setAudioBlob(null)
  }

  async function submitFinal() {
    if (!audioBlob) return
    const formData = new FormData()
    formData.append('assignment', assignmentId)
    formData.append('audio_file', audioBlob, 'submission.webm')

    try {
      await client.post('/assignments/submit/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit recording.')
    }
  }

  if (submitted) {
    return <p className="text-green-700 text-sm">Your recording was submitted. Your teacher will grade it soon.</p>
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">1. Listen to the prompt</p>
        <audio src={promptUrl} controls className="w-full" />
      </div>

      <div>
        <p className="text-sm font-medium mb-2">2. Record your answer</p>

        {!previewUrl && !recording && (
          <button onClick={startRecording} className="bg-black text-white rounded px-4 py-2 text-sm">
            Start recording
          </button>
        )}

        {recording && (
          <button onClick={stopRecording} className="bg-red-600 text-white rounded px-4 py-2 text-sm">
            Stop recording
          </button>
        )}

        {previewUrl && (
          <div className="space-y-3">
            <audio src={previewUrl} controls className="w-full" />
            <div className="flex gap-3">
              <button onClick={reRecord} className="text-sm underline">
                Re-record
              </button>
              <button onClick={submitFinal} className="bg-black text-white rounded px-4 py-2 text-sm">
                Submit final
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
