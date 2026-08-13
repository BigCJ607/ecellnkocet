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
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', paddingTop: 'calc(var(--nav-h) + 2rem)' }}>
      {/* Hero header */}
      <div className="page-container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>

        {/* Back link */}
        <TransitionLink to="/" className="font-ui font-semibold text-sm tracking-widest text-white mb-10 inline-flex items-center gap-2 hover:text-primary transition-colors no-underline group">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 0.2s' }} className="group-hover:-translate-x-1">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          BACK TO EVENTS
        </TransitionLink>

        {/* Registration status banner */}
        {isRegistered && myTicket && (
          <div
            className="mb-8 flex flex-wrap items-center gap-4 px-6 py-4"
            style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)', borderLeft: '3px solid var(--color-accent)' }}
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-accent)', boxShadow: '0 0 8px var(--color-accent)' }} />
              <span className="font-ui font-bold text-sm tracking-widest" style={{ color: 'var(--color-accent)' }}>YOU'RE REGISTERED</span>
            </div>
            <span className="font-ui text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Status: <strong style={{ color: 'var(--color-text)' }}>{myTicket.status}</strong>
            </span>
            {(myTeam?.name || myTicket.teamName) && (
              <span className="font-ui text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Team: <strong style={{ color: 'var(--color-accent)' }}>{myTeam?.name || myTicket.teamName}</strong>
              </span>
            )}
            <TransitionLink
              to="/my-tickets"
              className="ml-auto font-ui font-semibold text-xs tracking-widest no-underline px-4 py-2"
              style={{ border: '1px solid rgba(34,211,238,0.3)', color: 'var(--color-accent)', background: 'rgba(34,211,238,0.08)', letterSpacing: '0.12em' }}
            >
              VIEW MY PASS →
            </TransitionLink>
          </div>
        )}

        {/* Official Event Winners Banner */}
        {event.winners && event.winners.length > 0 && (
          <div
            className="mb-8 p-6 md:p-8 rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(234,179,8,0.14) 0%, rgba(245,158,11,0.06) 100%)',
              border: '1px solid rgba(234,179,8,0.4)',
              boxShadow: '0 0 50px rgba(234,179,8,0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">🏆</span>
              <div>
                <span className="font-ui text-xs font-bold tracking-widest text-amber-300 block">OFFICIAL EVENT WINNERS</span>
                <h2 className="font-display text-2xl md:text-3xl text-white m-0">Hall of Champions</h2>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.winners.map((w, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-black/40 border border-amber-500/30 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-ui text-xs font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {w.position === '1st' ? '🥇 1st Place Champion' : w.position === '2nd' ? '🥈 2nd Place Runner Up' : w.position === '3rd' ? '🥉 3rd Place' : '🏆 Winner'}
                    </span>
                  </div>
                  <h3 className="font-display text-xl text-white m-0">{w.teamName}</h3>
                  {w.members && w.members.length > 0 && (
                    <p className="font-ui text-xs text-gray-400 m-0">
                      Teammates: <strong className="text-gray-200">{w.members.join(', ')}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="font-display leading-none mb-5" style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', letterSpacing: '-0.02em', color: 'white' }}>
          {event.title}
        </h1>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-5 items-center mb-10">
          <span className="font-ui font-semibold tracking-widest text-xs px-3 py-1.5 inline-flex items-center gap-1.5" style={{ color: 'var(--color-accent)', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
            {event.category.toUpperCase()}
          </span>
          <span className="font-ui text-sm flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {event.date}
          </span>
          {event.time && (
            <span className="font-ui text-sm flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="font-ui text-sm flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {event.location}
          </span>
        </div>

        {/* Action buttons */}
        {isRegistered ? (
          <div className="flex flex-col gap-6">
            {/* Primary actions */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Registered badge */}
              <div className="flex items-center gap-3 px-6 py-4" style={{ border: '1px solid rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.05)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-accent)' }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="font-ui font-bold text-sm tracking-widest" style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}>REGISTERED</span>
              </div>

              {/* Create / Join Team */}
              {!myTeam && (
                <TransitionLink
                  to="/teams"
                  className="btn-primary px-8 py-4 text-sm flex items-center gap-2.5"
                  style={{ background: 'rgba(34,211,238,0.12)', borderColor: 'rgba(34,211,238,0.5)', color: 'var(--color-accent)', boxShadow: '0 0 20px rgba(34,211,238,0.2)', letterSpacing: '0.1em' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  CREATE / JOIN TEAM
                </TransitionLink>
              )}

              {/* Submit Project — only shown if enabled AND user is team captain */}
              {event.submissionsEnabled && isCaptain && (
                <button
                  onClick={() => setIsSubOpen(true)}
                  className="btn-primary px-8 py-4 text-sm flex items-center gap-2.5"
                  style={{ boxShadow: '0 0 20px rgba(99,102,241,0.3)', letterSpacing: '0.1em' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  SUBMIT PROJECT
                </button>
              )}
              {/* Non-captain notice */}
              {event.submissionsEnabled && myTeam && !isCaptain && (
                <div style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'var(--font-ui)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  👑 Only the team captain can submit the project
                </div>
              )}
            </div>

            {/* Unenroll — clearly separated, small and non-distracting */}
            <div className="flex items-center gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
              <span className="font-ui text-sm" style={{ color: 'var(--color-text-muted)' }}>Want to cancel your registration?</span>
              <button
                onClick={handleUnenroll}
                disabled={unsubmitting}
                className="btn-primary flex items-center gap-2 px-6 py-2.5 text-xs"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  borderColor: 'rgba(239,68,68,0.4)',
                  color: '#f87171',
                  boxShadow: 'none',
                  letterSpacing: '0.1em',
                  opacity: unsubmitting ? 0.6 : 1,
                }}
                onMouseEnter={e => Object.assign((e.currentTarget as HTMLButtonElement).style, { background: 'rgba(239,68,68,0.22)', borderColor: '#f87171', boxShadow: '0 0 14px rgba(239,68,68,0.2)' })}
                onMouseLeave={e => Object.assign((e.currentTarget as HTMLButtonElement).style, { background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)', boxShadow: 'none' })}
              >
                {unsubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 rounded-full" style={{ borderColor: '#f87171', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                    UNENROLLING...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    UNENROLL
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── NOT registered state ─ */
          <>
            {user ? (
              <button onClick={() => setIsRegOpen(true)} className="btn-primary px-10 py-4 text-lg">
                REGISTER NOW
              </button>
            ) : (
              <TransitionLink to="/auth" className="btn-primary px-10 py-4 text-lg no-underline inline-block">
                LOGIN TO REGISTER
              </TransitionLink>
            )}
          </>
        )}

        {/* My Team Section */}
        {myTeam && (
          <div className="mt-12 p-8 card-glass" style={{ border: '1px solid rgba(34,211,238,0.2)', background: 'rgba(34,211,238,0.02)', borderLeft: '3px solid var(--color-accent)' }}>
            <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
              <div>
                <p className="font-ui text-xs font-bold tracking-widest mb-1" style={{ color: 'var(--color-accent)', letterSpacing: '0.15em' }}>
                  {myTeam.createdBy === user?.id ? '⭐ YOUR TEAM (CREATOR)' : '👥 YOUR TEAM'}
                </p>
                <h3 className="font-display text-3xl text-white">{myTeam.name}</h3>
              </div>
              <TransitionLink
                to="/teams"
                className="font-ui font-semibold text-xs tracking-widest px-4 py-2 border no-underline flex items-center gap-2 self-start"
                style={{ borderColor: 'rgba(34,211,238,0.25)', color: 'var(--color-accent)', background: 'rgba(34,211,238,0.05)', letterSpacing: '0.1em' }}
              >
                MANAGE IN TEAMS HUB →
              </TransitionLink>
            </div>

            {/* Team Members */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="font-ui text-xs tracking-widest text-gray-400 font-semibold mb-3">
                MEMBERS — {myTeamMembers.length} / {event.maxTeamSize ?? 4}
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {myTeamMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-display text-xs font-bold text-white flex-shrink-0" style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)' }}>
                      {(m.userName?.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-ui font-semibold text-sm text-white truncate">{m.userName}</p>
                      <p className="font-ui text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {[m.userBranch, m.userYear, m.userDivision && `Div ${m.userDivision}`].filter(Boolean).join(' · ')}
                        {m.userPnr && ` · PNR ${m.userPnr}`}
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

      {/* Bottom CTA — changes based on registration */}
      <div className="py-20 text-center" style={{ background: 'var(--color-surface)' }}>
        {isRegistered ? (
          <>
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(34,211,238,0.1)', border: '2px solid rgba(34,211,238,0.4)', boxShadow: '0 0 30px rgba(34,211,238,0.2)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-accent)' }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="font-display text-5xl mb-3 text-white">YOU'RE ALL SET.</h2>
            <p className="font-ui text-sm tracking-wider mb-8" style={{ color: 'var(--color-text-muted)' }}>
              {myTicket?.teamName ? `Team "${myTicket.teamName}" · ` : ''}{myTicket?.status} · {event.date}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {event.submissionsEnabled && isCaptain && (
                <button
                  onClick={() => setIsSubOpen(true)}
                  className="btn-primary px-10 py-4 no-underline inline-block text-xl flex items-center gap-3"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  UPLOAD PROJECT
                </button>
              )}
              <TransitionLink
                to="/my-tickets"
                className="font-ui font-semibold text-sm tracking-widest px-10 py-4 no-underline flex items-center gap-2"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--color-text-muted)' }}
              >
                VIEW MY PASS
              </TransitionLink>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-5xl mb-6 text-white">READY TO JOIN US?</h2>
            {user ? (
              <button onClick={() => setIsRegOpen(true)} className="btn-primary px-10 py-4 no-underline inline-block text-xl">
                SECURE YOUR SEAT
              </button>
            ) : (
              <TransitionLink to="/auth" className="btn-primary px-10 py-4 no-underline inline-block text-xl">
                LOGIN TO REGISTER
              </TransitionLink>
            )}
          </>
        )}
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
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)' }}>
          <div className="min-h-screen relative flex flex-col justify-center py-12">
            <button
              onClick={() => setIsRegOpen(false)}
              className="absolute top-8 right-8 z-[60] w-12 h-12 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}
            >
              <span className="block w-5 h-px bg-white transform rotate-45 translate-y-1" />
              <span className="block w-5 h-px bg-white transform -rotate-45 -translate-y-1" />
            </button>
            <RegistrationPanel event={event} />
          </div>
        </div>
      )}
    </div>
  )
}
