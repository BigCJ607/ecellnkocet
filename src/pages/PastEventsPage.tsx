import { useEffect, useState } from 'react'
import { eventService } from '../services/eventService'
import type { EventData } from '../mocks/types'

export default function PastEventsPage() {
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    eventService.getPastEvents().then(data => {
      setEvents(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: 'var(--nav-h)' }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .past-card:hover { border-color:rgba(99,102,241,0.35)!important; filter:grayscale(0)!important; opacity:1!important; transform:translateY(-2px); }
        .past-card { transition:all 0.4s ease; }
        .gallery-btn:hover { background:rgba(99,102,241,0.15)!important; border-color:rgba(99,102,241,0.4)!important; color:#818cf8!important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 28 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.22em', color: '#6366f1', fontWeight: 700, margin: '0 0 6px' }}>
            ARCHIVE
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 5vw, 4rem)', color: '#fff', margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>
            Hall of Fame
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '10px 0 0' }}>
            Past hackathons, competitions &amp; completed events
          </p>
        </div>

        {events.length === 0 ? (
          <div style={{
            padding: '64px 40px', borderRadius: 16, border: '1px dashed rgba(99,102,241,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', margin: '0 0 6px' }}>No Past Events Yet</h3>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                Completed hackathons and competitions will be archived here.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
            {events.map((evt: EventData, i) => (
              <div
                key={evt.id}
                className="past-card"
                style={{
                  borderRadius: 16, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  filter: 'grayscale(0.6)', opacity: 0.8,
                  display: 'flex', flexDirection: 'column',
                  animation: `cardIn 0.4s ease ${i * 0.06}s both`,
                }}
              >
                {/* Top accent bar */}
                <div style={{ height: 3, background: 'linear-gradient(90deg,#6366f1,#22d3ee,#8b5cf6)' }} />

                <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Category + Date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                      {evt.category.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                      {evt.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: '#fff', margin: 0, lineHeight: 1.1 }}>
                    {evt.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6, flex: 1,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}>
                    {evt.fullDescription}
                  </p>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                    <div>
                      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 22, color: '#818cf8', lineHeight: 1 }}>
                        {evt.attendees ?? 0}
                      </span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>ATTENDEES</span>
                    </div>
                    <button
                      className="gallery-btn"
                      style={{ padding: '7px 16px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)', letterSpacing: '0.06em', transition: 'all 0.2s' }}
                    >
                      View Gallery
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
