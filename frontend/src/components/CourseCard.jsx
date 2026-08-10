import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../api/client'

const MEDIA_BASE = API_BASE_URL.replace('/api', '')

function resolveUrl(path) {
  if (!path) return null
  return path.startsWith('http') ? path : `${MEDIA_BASE}${path}`
}

export default function CourseCard({ course, onEnroll, enrolling }) {
  const thumbnail = resolveUrl(course.thumbnail)
  const promoVideo = resolveUrl(course.promo_video)

  return (
    <div className="paper-card overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-brand">
        {thumbnail ? (
          <img src={thumbnail} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 font-display text-3xl">
            {course.title[0]}
          </div>
        )}

        {promoVideo && (
          <a
            href={promoVideo}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-brand/0 hover:bg-brand/30 transition-colors group"
            title="Watch promo video"
          >
            <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-brand ml-0.5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </a>
        )}

        <span className="absolute top-3 right-3 bg-white/95 text-brand text-sm font-medium px-2.5 py-1 rounded font-mono">
          {Number(course.price) > 0 ? `${course.price} EGP` : 'Free'}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display text-lg text-ink mb-1">{course.title}</h3>
        <p className="text-sm text-ink/60 line-clamp-2 mb-4 flex-1">{course.description}</p>
        <p className="text-xs text-ink/40 mb-4">
          {course.lesson_count} lesson{course.lesson_count !== 1 ? 's' : ''}
        </p>

        {course.is_enrolled ? (
          <Link
            to={`/courses/${course.id}`}
            className="text-center text-sm bg-brand hover:bg-brand-light text-white rounded py-2"
          >
            Continue learning
          </Link>
        ) : (
          <button
            onClick={() => onEnroll(course.id)}
            disabled={enrolling}
            className="text-sm border border-brass text-brass-dark hover:bg-brass hover:text-white rounded py-2 transition-colors"
          >
            {enrolling
              ? Number(course.price) > 0 ? 'Redirecting to payment...' : 'Enrolling...'
              : Number(course.price) > 0 ? `Purchase for ${course.price} EGP` : 'Enroll now'}
          </button>
        )}
      </div>
    </div>
  )
}
