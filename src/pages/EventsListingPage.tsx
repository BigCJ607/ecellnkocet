import TransitionLink from '../components/ui/TransitionLink'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { eventService } from '../services/eventService'
import { type EventData } from '../mocks/types'
import { useApp } from '../context/AppContext'

gsap.registerPlugin(CustomEase)

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 4,
  delay: Math.random() * 3,
  dur: 2.5 + Math.random() * 3,
}))

export default function EventsListingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const { tickets } = useApp()

  // Set of event IDs the logged-in user is registered for
  const registeredIds = new Set(tickets.map(t => t.eventId))

  useEffect(() => {
    eventService.getEvents().then(data => {
      setEvents(data)
      setLoading(false)
    })
  }, [])

  const categories = ['All', ...Array.from<string>(new Set(events.map((e: EventData) => e.category)))]

  const filteredEvents = events.filter((e: EventData) => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory
    return matchesSearch && matchesCat
  })

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 })

      tl.fromTo(
        '.hero-stripe',
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 0.6, ease: 'p5Overshoot', stagger: 0.08 }
      )
      tl.fromTo(
        '.hero-word',
        { y: '110%', opacity: 0, skewX: -8 },
        { y: '0%', opacity: 1, skewX: 0, duration: 0.5, ease: 'p5Overshoot', stagger: 0.12 },
        '-=0.3'
      )
      tl.fromTo(
        '.hero-sub',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'p5Overshoot' },
        '-=0.2'
      )
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Hero */}
      <div
        ref={heroRef}
        className="relative flex flex-col justify-center overflow-hidden noise-overlay"
        style={{ paddingTop: 'calc(var(--nav-h) + var(--space-2xl))', paddingBottom: 'var(--space-2xl)' }}
      >
        <div className="scanline" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="hero-stripe absolute"
              style={{
                background: i === 0 ? 'rgba(99,102,241,0.06)' : i === 1 ? 'rgba(99,102,241,0.03)' : 'rgba(34,211,238,0.02)',
                height: `${35 - i * 8}%`, width: '120%', left: '-10%', top: `${20 + i * 25}%`,
                transform: `skewY(-8deg) translateY(${i * 2}%)`,
              }}
            />
          ))}
          {PARTICLES.map((p) => (
            <div
              key={p.id} className="absolute rounded-full"
              style={{
                left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
                background: p.id % 3 === 0 ? 'var(--color-primary)' : p.id % 3 === 1 ? 'var(--color-accent)' : 'white',
                opacity: 0.12 + Math.random() * 0.15,
                animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="page-container relative z-10">
          <h1 className="font-display leading-none mb-8" style={{ fontSize: 'clamp(4rem, 10vw, 8rem)', letterSpacing: '-0.02em' }}>
            <div className="overflow-hidden"><span className="hero-word inline-block text-gradient-primary">DISCOVER</span></div>
            <div className="overflow-hidden"><span className="hero-word inline-block text-gradient-accent">NEXT-GEN</span></div>
            <div className="overflow-hidden"><span className="hero-word inline-block" style={{ color: 'var(--color-text)' }}>EXPERIENCES</span></div>
          </h1>
          <p className="hero-sub text-lg max-w-xl" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            Browse upcoming summits, workshops, and immersive events. Filter by category and secure your spot today.
          </p>
        </div>
      </div>

      {/* Listing Section */}
      <div className="page-container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>

        {/* Search + Filters row */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center" style={{ marginBottom: 'var(--space-xl)' }}>
          {/* Search with icon */}
          <div className="relative w-full md:w-96">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search events..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {categories.map((c: string) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className="px-5 py-2 font-ui font-semibold text-sm tracking-widest cursor-pointer transition-all duration-200"
                style={{
                  background: selectedCategory === c ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                  color: selectedCategory === c ? 'white' : 'var(--color-text-muted)',
                  border: `1px solid ${selectedCategory === c ? 'var(--color-primary)' : 'rgba(99,102,241,0.2)'}`,
                  borderRadius: '4px',
                }}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Event Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full text-center py-20 text-gray-500 font-ui text-xl">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="col-span-full card-glass p-16 text-center">
              <h3 className="font-display text-3xl text-white mb-2">NO UPCOMING EVENTS PUBLISHED</h3>
              <p className="font-ui text-sm text-gray-400 mb-6 tracking-wide">
                Publish a new hackathon from the Admin Console or run your Supabase schema seed script.
              </p>
              <TransitionLink to="/admin" className="btn-primary px-8 py-3 text-xs font-bold tracking-widest no-underline inline-block">
                OPEN ADMIN CONSOLE →
              </TransitionLink>
            </div>
          ) : filteredEvents.map((evt: EventData, idx: number) => {
            const isFeatured = idx === 0
            return (
              <TransitionLink to={`/events/${evt.id}`} key={evt.id} className={`no-underline ${isFeatured ? 'md:col-span-2 lg:col-span-1' : ''}`}>
                <div
                  className="card-glass h-full flex flex-col cursor-pointer group"
                  style={{
                    padding: isFeatured ? '2.5rem' : '1.75rem',
                    transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
                    border: isFeatured ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(99,102,241,0.15)',
                    boxShadow: isFeatured ? '0 0 30px rgba(99,102,241,0.12)' : 'none',
                    background: isFeatured ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)'
                    e.currentTarget.style.transform = 'translateY(-6px)'
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(34,211,238,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isFeatured ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = isFeatured ? '0 0 30px rgba(99,102,241,0.12)' : 'none'
                  }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-ui font-semibold text-xs tracking-widest px-2.5 py-1" style={{ color: 'var(--color-accent)', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
                      {evt.category.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      {evt.winners && evt.winners.length > 0 && (
                        <span
                          className="font-ui font-bold text-xs tracking-widest px-2.5 py-1 flex items-center gap-1"
                          style={{ color: '#fde047', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)', boxShadow: '0 0 10px rgba(234,179,8,0.2)' }}
                          title={`Winner: ${evt.winners[0].teamName}`}
                        >
                          🏆 WINNER: {evt.winners[0].teamName.toUpperCase()}
                        </span>
                      )}
                      {registeredIds.has(evt.id) && (
                        <span className="font-ui font-semibold text-xs tracking-widest px-2.5 py-1 flex items-center gap-1.5" style={{ color: 'var(--color-accent)', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.3)' }}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--color-accent)', boxShadow: '0 0 4px var(--color-accent)' }} />
                          JOINED
                        </span>
                      )}
                      {isFeatured && (
                        <span className="font-ui font-bold text-xs tracking-widest px-2.5 py-1" style={{ color: 'var(--color-primary)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>★ FEATURED</span>
                      )}
                    </div>
                  </div>
                  <h3
                    className="font-display mb-3 text-white leading-tight"
                    style={{ fontSize: isFeatured ? 'clamp(2rem, 4vw, 2.75rem)' : '1.75rem' }}
                  >
                    {evt.title}
                  </h3>
                  <p className="font-ui font-semibold text-sm mb-4" style={{ color: 'var(--color-primary)' }}>{evt.date}</p>
                  <p className="text-sm mb-8 flex-grow" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{evt.shortDescription}</p>
                  <div className="flex items-center gap-2 font-ui font-bold tracking-widest text-sm" style={{ color: 'var(--color-accent)' }}>
                    EXPLORE
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </TransitionLink>
            )
          })}
          {!loading && filteredEvents.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-500 font-ui text-xl">No events found matching your criteria.</div>
          )}
        </div>
      </div>
    </div>
  )
}
