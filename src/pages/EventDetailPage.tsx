import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { eventService } from '../services/eventService'
import { teamService } from '../services/teamService'
import { type EventData, type Team, type TeamMember } from '../mocks/types'
import EventInfoSection from '../components/layout/EventInfoSection'
import ScheduleSection from '../components/layout/ScheduleSection'
import RegistrationPanel from '../components/layout/RegistrationPanel'
import SubmissionPanel from '../components/layout/SubmissionPanel'
import TransitionLink from '../components/ui/TransitionLink'
import { useApp } from '../context/AppContext'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRegOpen, setIsRegOpen] = useState(false)
  const [isSubOpen, setIsSubOpen] = useState(false)

  const { user, tickets, refreshTickets } = useApp()
  const [unsubmitting, setUnsubmitting] = useState(false)
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [myTeamMembers, setMyTeamMembers] = useState<TeamMember[]>([])
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)

  useEffect(() => {
    if (id) {
      eventService.getEventById(id).then(data => {
        setEvent(data || null)
        setLoading(false)
      })
      eventService.getEventStats(id).then(stats => {
        setEnrollmentCount(stats.enrollmentCount)
        setTeamCount(stats.teamCount)
      })
    }
  }, [id, tickets])

  // Fetch team details for this user & event
  useEffect(() => {
    if (id && user) {
      teamService.getUserTeamForEvent(id, user.id).then(async t => {
        setMyTeam(t)
        if (t) {
          const members = await teamService.getTeamMembers(t.id)
          setMyTeamMembers(members)
        } else {
          setMyTeamMembers([])
        }
      })
    } else {
      setMyTeam(null)
      setMyTeamMembers([])
    }
  }, [id, user, tickets])

  // Derived registration state
  const myTicket = id ? tickets.find(t => t.eventId === id) : null
  const isRegistered = !!myTicket
  const isCaptain = !!myTeam && myTeam.createdBy === user?.id

  const handleUnenroll = async () => {
    if (!user || !event) return
    if (!window.confirm(`Are you sure you want to unenroll from "${event.title}"? Your pass will be cancelled.`)) {
      return
    }
    setUnsubmitting(true)
    try {
      await eventService.unenrollFromEvent(event.id, user.id)
      await refreshTickets()
    } catch (err: any) {
      alert(`Failed to unenroll: ${err.message}`)
    } finally {
      setUnsubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: 'var(--color-bg)' }}>
        <div className="w-12 h-12 mb-4 border-2 rounded-full" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p className="font-ui tracking-widest text-sm" style={{ color: 'var(--color-text-muted)' }}>LOADING EVENT...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: 'var(--color-bg)' }}>
        <h1 className="font-display text-6xl text-gradient-primary mb-4">EVENT NOT FOUND</h1>
        <TransitionLink to="/" className="btn-primary px-8 py-3 no-underline inline-block">BACK TO EVENTS</TransitionLink>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* ── Banner image — shorter on mobile so content is above the fold ── */}
      <div
        className="relative bg-cover bg-center w-full"
        style={{
          height: 'clamp(180px, 28vh, 520px)',
          backgroundImage: `url(${event.posterUrl || '/background/eureka.jpg'})`,
        }}
      >
        {/* Subtle bottom fade so the banner blends into the page */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(10,10,10,0.55) 100%)' }} />
        {/* Back link — top-left of banner */}
        <TransitionLink
          to="/events"
          className="absolute left-6 font-body text-xs tracking-[0.2em] text-white/70 hover:text-white inline-flex items-center gap-2 no-underline group z-10 animate-slide-left-fade"
          style={{ top: 'calc(var(--nav-h) + 1.5rem)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-300 group-hover:-translate-x-1">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          BACK TO EVENTS
        </TransitionLink>
      </div>

      {/* ── Page content below the banner ── */}
      <div className="page-container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <div className="max-w-4xl">

          {/* Title */}
          <h1
            className="font-display leading-none mb-4 md:mb-6 animate-slide-left-fade"
            style={{ fontSize: 'clamp(2rem, 7vw, 5.5rem)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)', animationFillMode: 'both' }}
          >
            {event.title}
          </h1>

          {/* Meta row with icons */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 items-center mb-10 animate-slide-left-fade delay-100" style={{ animationFillMode: 'both' }}>
            {/* Category badge */}
            <span className="font-body text-[10px] font-extrabold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full" style={{ backgroundColor: 'var(--color-slate-blue)', color: '#fff' }}>
              {event.category}
            </span>
            {/* Date */}
            <span className="font-body text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {event.date}
            </span>
            {/* Time */}
            {event.time && (
              <span className="font-body text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {/* Venue */}
            <span className="font-body text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {event.location}
            </span>
          </div>

          {/* Action buttons */}
          <div className="animate-slide-left-fade delay-200" style={{ animationFillMode: 'both' }}>
            {isRegistered ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-full" style={{ border: '1px solid var(--color-sand)', background: 'transparent' }}>
                    <span className="font-body font-bold text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-slate-blue)' }}>✓ REGISTERED</span>
                  </div>

                  {/* Create / Join Team */}
                  {!myTeam && (
                    <TransitionLink
                      to="/teams"
                      className="px-8 py-3 rounded-full text-[11px] flex items-center gap-2 font-body font-extrabold tracking-[0.18em] uppercase no-underline transition-all duration-300 hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg)', border: 'none' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      Create / Join Team
                    </TransitionLink>
                  )}

                  {/* Submit Project */}
                  {event.submissionsEnabled && isCaptain && (
                    <button
                      onClick={() => setIsSubOpen(true)}
                      className="px-8 py-3 rounded-full text-[11px] flex items-center gap-2 font-body font-extrabold tracking-[0.18em] uppercase transition-all duration-300 cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg)', border: 'none' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Submit Project
                    </button>
                  )}
                  {event.submissionsEnabled && myTeam && !isCaptain && (
                    <div className="px-6 py-2.5 rounded-full text-[10px] font-body" style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-cream)' }}>
                      Only team captain can submit
                    </div>
                  )}
                </div>

                {/* Unenroll */}
                <div className="flex items-center gap-4" style={{ borderTop: '1px solid var(--color-cream)', paddingTop: '1.5rem' }}>
                  <button
                    onClick={handleUnenroll}
                    disabled={unsubmitting}
                    className="flex items-center gap-2 text-[10px] font-body font-bold tracking-widest uppercase cursor-pointer transition-colors hover:text-red-500"
                    style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text-muted)', opacity: unsubmitting ? 0.6 : 1, padding: 0 }}
                  >
                    {unsubmitting ? 'UNENROLLING...' : 'CANCEL REGISTRATION'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-5">
                {user ? (
                  <button
                    onClick={() => setIsRegOpen(true)}
                    className="rounded-full flex items-center gap-3 cursor-pointer group transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg)', border: 'none', padding: '1rem 2.5rem' }}
                  >
                    <span className="font-body text-[13px] font-black tracking-[0.2em] uppercase">ENROLL NOW</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                  </button>
                ) : (
                  <TransitionLink
                    to="/auth"
                    className="rounded-full flex items-center gap-3 font-body text-[11px] font-extrabold tracking-[0.18em] uppercase no-underline transition-all duration-200 hover:opacity-90"
                    style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg)', border: 'none', padding: '1rem 2.5rem' }}
                  >
                    Login to Enroll
                  </TransitionLink>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Team Section */}
        {myTeam && (
          <div className="mt-12 pt-10" style={{ borderTop: '1px solid var(--color-cream)' }}>
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <p className="font-body text-[10px] font-extrabold tracking-[0.2em] mb-2 uppercase" style={{ color: 'var(--color-slate-blue)' }}>
                  {myTeam.createdBy === user?.id ? '⭐ YOUR TEAM (CAPTAIN)' : '👥 YOUR TEAM'}
                </p>
                <h3 className="font-display text-4xl m-0" style={{ color: 'var(--color-text-primary)' }}>{myTeam.name}</h3>
              </div>
              <TransitionLink
                to="/teams"
                className="font-body font-extrabold text-[10px] tracking-[0.15em] px-5 py-2.5 rounded-full no-underline flex items-center gap-2 transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--color-sand)', color: 'var(--color-text-primary)', background: 'transparent' }}
              >
                MANAGE IN TEAMS HUB →
              </TransitionLink>
            </div>

            {/* Team Members */}
            <div>
              <p className="font-body text-[10px] tracking-[0.15em] font-bold mb-4 uppercase" style={{ color: 'var(--color-text-muted)' }}>
                MEMBERS ({myTeamMembers.length} / {event.maxTeamSize ?? 4})
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myTeamMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors" style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-cream)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-display text-sm font-bold flex-shrink-0" style={{ background: 'var(--color-slate-blue)', color: '#fff' }}>
                      {(m.userName?.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-body font-bold text-sm truncate m-0 mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{m.userName}</p>
                      <p className="font-body text-[11px] truncate m-0" style={{ color: 'var(--color-text-muted)' }}>
                        {[m.userBranch, m.userYear, m.userDivision && `Div ${m.userDivision}`].filter(Boolean).join(' · ')}
                        {m.userPnr && ` · ${m.userPnr}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <EventInfoSection
        event={event}
        enrollmentCount={enrollmentCount}
        teamCount={teamCount}
      />
      <ScheduleSection event={event} />

      {/* Bottom — Back to Top + conditional upload action */}
      <div className="py-20 text-center" style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-cream)' }}>
        {/* Show upload button for captains when submissions are enabled */}
        {isRegistered && event.submissionsEnabled && isCaptain && (
          <div className="mb-10">
            <button
              onClick={() => setIsSubOpen(true)}
              className="btn-primary px-10 py-4 inline-flex items-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Project
            </button>
          </div>
        )}

        {/* Back to Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex flex-col items-center gap-3 cursor-pointer group"
          style={{ background: 'none', border: 'none' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1" style={{ border: '1px solid var(--color-sand)', color: 'var(--color-slate-blue)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </div>
          <span className="font-body text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Back to top</span>
        </button>
      </div>

      {/* Submission Modal */}
      {isSubOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)' }}>
          <div className="min-h-screen flex items-center justify-center py-12 px-6">
            <div className="w-full max-w-2xl">
              <SubmissionPanel
                eventId={event.id}
                eventTitle={event.title}
                teamId={myTeam?.id || myTicket?.teamName}
                onClose={() => setIsSubOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal — only shown when not yet registered */}
      {isRegOpen && !isRegistered && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--color-bg)', backdropFilter: 'blur(8px)' }}>
          <div className="min-h-screen flex items-center justify-center py-12 px-4">
            <button
              onClick={() => setIsRegOpen(false)}
              className="absolute top-6 right-6 md:top-10 md:right-10 z-[60] w-12 h-12 flex items-center justify-center cursor-pointer rounded-full transition-all duration-300 hover:bg-[rgba(62,88,104,0.06)]"
              style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-cream)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-slate-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="w-full relative z-50">
              <RegistrationPanel event={event} />
            </div>
          </div>
        </div>
      )}
      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4" style={{ backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-cream)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        {isRegistered ? (
          <TransitionLink
            to="/my-tickets"
            className="w-full py-4 text-sm flex items-center justify-center gap-2 font-body font-semibold tracking-widest uppercase no-underline transition-colors"
            style={{ backgroundColor: 'var(--color-slate-blue)', color: 'var(--color-white)' }}
          >
            View Pass
          </TransitionLink>
        ) : user ? (
          <button
            onClick={() => setIsRegOpen(true)}
            className="w-full py-4 text-sm flex items-center justify-center gap-2 font-body font-semibold tracking-widest uppercase border-none cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--color-slate-blue)', color: 'var(--color-white)' }}
          >
            Register Now
          </button>
        ) : (
          <TransitionLink
            to="/auth"
            className="w-full py-4 text-sm flex items-center justify-center gap-2 font-body font-semibold tracking-widest uppercase no-underline transition-colors"
            style={{ backgroundColor: 'var(--color-slate-blue)', color: 'var(--color-white)' }}
          >
            Login to Register
          </TransitionLink>
        )}
      </div>

    </div>
  )
}
