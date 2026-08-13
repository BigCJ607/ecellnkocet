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
      <section className={`relative w-full h-[85vh] min-h-[600px] flex items-center justify-center ${isLanding ? 'bg-landing' : 'bg-events'}`}>
        <div className="absolute inset-0 bg-black/5" />
        
        <div className="relative z-10 text-center px-6 mt-16 animate-fade-in">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl mb-6 tracking-tight text-white drop-shadow-md">
            {isLanding ? 'EVENT ZERO' : 'EXPERIENCES'}
          </h1>
          <p className="font-body text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto text-white drop-shadow">
            {isLanding ? 'Discover events, teams and opportunities.' : 'Browse our curated collection of upcoming summits, workshops, and immersive events.'}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="page-container py-24 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {/* Search & Filters */}
        <div className="flex flex-col gap-6 mb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="w-full md:w-96 relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-[var(--color-slate-blue)] text-[var(--color-text-secondary)] opacity-60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search experiences..."
                className="w-full bg-white border border-[var(--color-cream)] rounded-full py-3.5 pl-12 pr-6 text-sm font-body text-[var(--color-text-primary)] shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-slate-blue)]/20 focus:border-[var(--color-slate-blue)] hover:shadow-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              {categories.map((c) => {
                const isSelected = selectedCategory === c
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-5 py-2.5 text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-300 transform hover:-translate-y-0.5 ${
                      isSelected
                        ? 'bg-[var(--color-slate-blue)] text-white shadow-md shadow-[var(--color-slate-blue)]/20 border border-[var(--color-slate-blue)]'
                        : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-cream)] hover:border-[var(--color-sand)] hover:bg-[var(--color-ivory)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
            filteredEvents.map((evt) => (
              <EventCard
                key={evt.id}
                evt={evt}
                isRegistered={registeredIds.has(evt.id)}
                onRegisterClick={handleRegisterClick}
              />
            ))
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
