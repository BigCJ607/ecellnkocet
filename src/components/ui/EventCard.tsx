import TransitionLink from './TransitionLink'
import { useNavigate } from 'react-router-dom'
import type { EventData } from '../../mocks/types'

const FALLBACK_POSTER = '/background/eureka.jpg'

interface EventCardProps {
  evt: EventData
  isRegistered: boolean
  onRegisterClick: (e: React.MouseEvent, evt: EventData) => void
  /** When true shows "VIEW PASS →" instead of register button, and links to /my-tickets */
  isPreview?: boolean
}

export default function EventCard({ evt, isRegistered, onRegisterClick, isPreview }: EventCardProps) {
  const navigate = useNavigate()
  const poster = evt.posterUrl || FALLBACK_POSTER

  // Extract clean year from date string e.g. "AUG 22–24, 2026" → "2026"
  const yearMatch = evt.date.match(/\b(20\d{2})\b/)
  const year = yearMatch ? yearMatch[1] : '2026'

  const handleCardClick = (e: React.MouseEvent) => {
    if (isPreview) return
    const origin = { x: e.clientX, y: e.clientY }
    window.dispatchEvent(new CustomEvent('page-transition', { 
      detail: { 
        action: 'in', 
        variant: 'standard', 
        origin,
        onComplete: () => {
          navigate(`/events/${evt.id}`)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('page-transition', { detail: { action: 'out', variant: 'standard', origin } }))
          }, 30)
        }
      } 
    }))
  }

  return (
    <div
      className="group relative overflow-hidden flex flex-col"
      onClick={handleCardClick}
      style={{
        aspectRatio: '3 / 2',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.18)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'
      }}
    >
      {/* ── Poster Image ── */}
      <img
        src={poster}
        alt={evt.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />

      {/* ── Top dark scrim removed to match reference (we'll just use the bottom gradient) ── */}

      {/* ── Bottom gradient for text readability (made taller) ── */}
      <div
        className="absolute inset-0 z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.7) 40%, transparent 80%)' }}
      />

      {/* ── Bottom content (Stacked: Badge/Year -> Title -> Desc -> Button) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 flex flex-col gap-3">
        
        {/* Row 1: Badge + Year */}
        <div className="flex items-center gap-3">
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 9,
              fontFamily: 'var(--font-body)',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#fff',
              backgroundColor: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            {evt.category}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            {year}
          </span>
        </div>

        {/* Row 2: Title */}
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#fff',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {evt.title}
        </h3>

        {/* Row 3: Description */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {evt.shortDescription}
        </p>

        {/* Row 4: Button */}
        <div style={{ marginTop: 6 }}>
          {isPreview ? (
            <span className="group/btn flex items-center font-body text-[11px] font-extrabold tracking-[0.18em] uppercase text-white cursor-default">
              PREVIEW <span className="ml-1 inline-block transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
            </span>
          ) : isRegistered ? (
            <TransitionLink
              to="/my-tickets"
              onClick={(e) => e.stopPropagation()}
              className="group/btn flex items-center font-body text-[11px] font-extrabold tracking-[0.18em] uppercase text-white no-underline"
            >
              VIEW PASS <span className="ml-1 inline-block transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
            </TransitionLink>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRegisterClick(e, evt) }}
              className="group/btn flex items-center font-body text-[11px] font-extrabold tracking-[0.18em] uppercase text-white bg-transparent border-none p-0 cursor-pointer"
            >
              ENROLL NOW <span className="ml-1 inline-block transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
