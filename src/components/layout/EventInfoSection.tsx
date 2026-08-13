import SectionTransition from '../ui/SectionTransition'
import type { EventData, Speaker } from '../../mocks/types'
import { calculateEventDays } from '../../services/eventService'

interface EventInfoSectionProps {
  event: EventData
  enrollmentCount?: number
  teamCount?: number
}

export default function EventInfoSection({ event, enrollmentCount = 0, teamCount = 0 }: EventInfoSectionProps) {
  // Calculate days accurately (e.g. 1 Day, 3 Days)
  const totalDays = calculateEventDays(event.date, event.schedule?.length);

  // Attendees count: use real live enrollments count from tickets table if greater or if event.attendees is '0'
  const parsedTarget = parseInt(event.attendees || '0', 10);
  let attendeesDisplay = `${enrollmentCount}`;
  if (!isNaN(parsedTarget) && parsedTarget > enrollmentCount) {
    attendeesDisplay = event.attendees;
  } else if (enrollmentCount > 0) {
    attendeesDisplay = `${enrollmentCount}`;
  } else if (event.attendees && event.attendees !== '0') {
    attendeesDisplay = event.attendees;
  }

  // Second stat: Speakers if > 0, otherwise Teams or Mentors
  const hasSpeakers = Array.isArray(event.speakers) && event.speakers.length > 0;
  const secondStat = hasSpeakers
    ? { value: `${event.speakers.length}+`, label: 'Speakers' }
    : teamCount > 0
    ? { value: `${teamCount}`, label: 'Teams' }
    : { value: 'Open', label: 'Registration' };

  const stats = [
    { value: attendeesDisplay, label: 'Attendees' },
    secondStat,
    { value: `${totalDays}`, label: totalDays === 1 ? 'Day' : 'Days' },
  ]

  return (
    <SectionTransition
      id="event"
      direction="ltr"
      numSelector=".event-section-num"
      rowSelector=".event-card"
      style={{
        background: 'var(--color-surface)',
        padding: '6rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span className="section-num event-section-num" aria-hidden="true">01</span>

      <div className="page-container relative z-10">
        <div className="mb-16 content-backdrop">
          <p className="font-ui font-semibold tracking-widest text-xs mb-3" style={{ color: 'var(--color-primary)', letterSpacing: '0.25em' }} data-reveal>
            ABOUT {event.title}
          </p>
          <h2 className="font-display leading-none mb-6" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', color: 'var(--color-text)' }} data-reveal>
            WHERE VISION <br /><span className="text-gradient-primary">MEETS REALITY</span>
          </h2>
          <div style={{ height: 2, width: 80, background: 'var(--color-primary)', marginBottom: '1.5rem' }} data-reveal />
          <p className="text-base max-w-2xl" style={{ color: 'var(--color-text-muted)', lineHeight: 1.8 }} data-reveal>
            {event.fullDescription || event.shortDescription || 'Join hundreds of developers, designers, and innovators.'}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" style={{ marginBottom: 'var(--space-2xl)' }} data-reveal>
          {stats.map((stat) => (
            <div key={stat.label} className="card-glass p-6 flex flex-col gap-2 group" style={{ transition: 'border-color 0.2s ease' }} onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.5)')} onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.15)')}>
              <span className="font-display" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', color: 'var(--color-primary)', lineHeight: 1 }}>{stat.value}</span>
              <span className="font-ui font-semibold tracking-widest text-xs" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>{stat.label.toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* Venue info */}
        <div className="grid md:grid-cols-2 gap-8" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="event-card card-glass p-8">
            <p className="font-ui font-semibold tracking-widest text-xs mb-4" style={{ color: 'var(--color-primary)', letterSpacing: '0.2em' }}>VENUE</p>
            <h3 className="font-display text-3xl mb-2" style={{ color: 'var(--color-text)' }}>{event.location.split(',')[0]}</h3>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{event.address}</p>
            <div className="mt-6 h-px" style={{ background: 'linear-gradient(to right, var(--color-primary), transparent)' }} />
            <p className="mt-4 font-ui font-semibold text-sm tracking-wider" style={{ color: 'var(--color-accent)' }}>
              {event.date}
              {event.time && (
                <span className="ml-3 opacity-80">
                  ⏰ {new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Speakers grid */}
        <div style={{ paddingTop: 'var(--space-sm)' }}>
          <p className="font-ui font-semibold tracking-widest text-xs mb-8 content-backdrop inline-block" style={{ color: 'var(--color-primary)', letterSpacing: '0.25em', padding: '0.5rem 1rem' }} data-reveal>
            FEATURED SPEAKERS & MENTORS
          </p>
          {hasSpeakers ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {event.speakers.map((spk: Speaker) => (
                <div key={spk.id} className="event-card card-glass p-6 flex flex-col gap-4 cursor-default group" style={{ transition: 'border-color 0.3s ease, transform 0.3s ease' }} onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = spk.color + '55'; el.style.transform = 'translateY(-4px)' }} onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(99,102,241,0.15)'; el.style.transform = 'translateY(0)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-display text-xl" style={{ background: `${spk.color}22`, border: `2px solid ${spk.color}55`, color: spk.color }}>{spk.initials}</div>
                  <div>
                    <p className="font-ui font-bold text-sm mb-1" style={{ color: 'var(--color-text)' }}>{spk.name}</p>
                    <p className="font-body text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>{spk.role}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-glass p-8 border border-white/10 max-w-xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🎙</span>
                <h4 className="font-display text-lg text-white m-0">Lineup in Preparation</h4>
              </div>
              <p className="font-ui text-xs text-gray-400 m-0 leading-relaxed">
                Keynote speakers, workshop mentors, and industry judges will be announced prior to the event. Register now to secure your pass!
              </p>
            </div>
          )}
        </div>
      </div>
    </SectionTransition>
  )
}
