import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TransitionLink from '../components/ui/TransitionLink'
import EventCard from '../components/ui/EventCard'
import RegistrationPanel from '../components/layout/RegistrationPanel'
import { eventService } from '../services/eventService'
import { type EventData } from '../mocks/types'
import { useApp } from '../context/AppContext'

export default function EventsListingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [regEvent, setRegEvent] = useState<EventData | null>(null)

  const { user, tickets } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  const isLanding = location.pathname === '/'

  const registeredIds = new Set(tickets.map(t => t.eventId))

  useEffect(() => {
    eventService.getEvents().then(data => {
      setEvents(data)
      setLoading(false)
    })
  }, [])

  const processedEvents = events.map(e => ({
    ...e,
    category: e.category.toLowerCase() === 'pitching competition' ? 'Competitions' : e.category
  }))

  const categories = ['All', ...Array.from(new Set(processedEvents.map((e) => e.category)))]

  const filteredEvents = processedEvents.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory
    return matchesSearch && matchesCat
  })

  const handleRegisterClick = (e: React.MouseEvent, evt: EventData) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/auth')
      return
    }
    setRegEvent(evt)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className={`relative w-full h-[35vh] md:h-[60vh] min-h-[240px] md:min-h-[400px] flex items-center justify-center ${isLanding ? 'bg-landing' : 'bg-events'}`}>
        <div className="absolute inset-0 bg-black/5" />

        <div className="relative z-10 text-center px-6 mt-12 md:mt-16 animate-slide-down-fade">
          <h1 className="font-display text-4xl md:text-7xl lg:text-8xl mb-4 md:mb-6 tracking-tight text-white drop-shadow-md">
            {isLanding ? 'Ecell NKOCET' : 'EXPERIENCES'}
          </h1>
          <p className="font-body text-sm md:text-xl font-light tracking-wide max-w-2xl mx-auto text-white drop-shadow">
            {isLanding ? 'Discover events, teams and opportunities.' : 'Browse our curated collection of upcoming summits, workshops, and immersive events.'}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="page-container py-10 md:py-24">
        {/* ── Search + Filter Toolbar ── */}
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-10 md:mb-16 animate-slide-up-fade w-full"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Search input (Short beige circular bar) */}
          <div className="relative flex-shrink-0 w-full sm:w-[280px]">
            <span
              className="absolute left-0 top-0 bottom-0 pointer-events-none flex items-center justify-center w-[42px] h-[42px]"
              style={{ color: 'var(--color-slate-blue)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search experiences..."
              className="w-full font-body text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-slate-blue)]/20 focus:border-[var(--color-slate-blue)] transition-all duration-300"
              style={{
                backgroundColor: 'var(--color-ivory)',
                border: '1px solid var(--color-cream)',
                color: 'var(--color-text-primary)',
                padding: '0.625rem 1.25rem 0.625rem 2.75rem',
                height: '42px',
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter chips (Shifted to the right) */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar sm:flex-wrap items-center justify-end flex-1">
            {categories.map((c) => {
              const isSelected = selectedCategory === c
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className="font-body text-[11px] font-extrabold tracking-[0.2em] uppercase rounded-full transition-all duration-200 cursor-pointer flex-shrink-0"
                  style={{
                    height: '42px',
                    padding: '0 1.25rem',
                    backgroundColor: isSelected ? 'var(--color-slate-blue)' : 'var(--color-ivory)',
                    color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                    border: isSelected ? '1px solid var(--color-slate-blue)' : '1px solid var(--color-cream)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(62,88,104,0.06)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-ivory)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'
                    }
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {loading ? (
            <div className="col-span-full text-center py-24 font-body text-editorial opacity-60">Loading curated experiences...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="col-span-full card-editorial text-center py-24">
              <h3 className="font-display text-3xl mb-4">No experiences found</h3>
              <p className="font-body opacity-80 mb-8 max-w-md mx-auto">We couldn't find any events matching your criteria. Please try adjusting your filters or search term.</p>
              <TransitionLink to="/admin" className="btn-secondary">
                Open Admin Console
              </TransitionLink>
            </div>
          ) : (
            filteredEvents.map((evt, idx) => {
              const delayClass = `delay-${Math.min((idx + 2) * 100, 500)}`
              return (
                <div key={evt.id} className={`animate-slide-up-fade ${delayClass}`}>
                  <EventCard
                    evt={evt}
                    isRegistered={registeredIds.has(evt.id)}
                    onRegisterClick={handleRegisterClick}
                  />
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Inline Registration Modal */}
      {regEvent && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: 'rgba(245, 241, 232, 0.95)', backdropFilter: 'blur(10px)' }}>
          <div className="min-h-screen relative flex flex-col justify-center py-12">
            <button
              onClick={() => setRegEvent(null)}
              className="absolute top-8 right-8 z-[110] w-12 h-12 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              style={{ background: 'var(--color-white)', border: '1px solid var(--color-sand)', borderRadius: '50%' }}
            >
              <span className="block w-5 h-px bg-[var(--color-text-primary)] transform rotate-45 translate-y-1" />
              <span className="block w-5 h-px bg-[var(--color-text-primary)] transform -rotate-45 -translate-y-1" />
            </button>
            <RegistrationPanel event={regEvent} />
          </div>
        </div>
      )}
    </div>
  )
}
