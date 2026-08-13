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
        background: 'linear-gradient(rgba(251, 249, 244, 0.8), rgba(251, 249, 244, 0.95)), url(/background/image3.jpg) center/cover no-repeat',
        padding: '6rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span className="section-num event-section-num" aria-hidden="true">01</span>

      <div className="page-container relative z-10 flex flex-col items-center">
        <div className="p-10 md:p-16 rounded-[2.5rem] w-[95%] max-w-[1200px] flex flex-col items-center text-center gap-14" style={{ 
          background: 'linear-gradient(135deg, rgba(62, 88, 104, 0.85) 0%, rgba(32, 40, 43, 0.95) 100%)', 
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
          backdropFilter: 'blur(24px)'
        }}>
          {/* Top: Text */}
          <div className="flex flex-col items-center max-w-3xl">
            <p className="font-ui font-bold tracking-[0.3em] text-[11px] mb-6 uppercase" style={{ color: 'var(--color-sand)' }}>
              ABOUT {event.title}
            </p>
            <h2 className="font-display leading-[1.1] mb-8" style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', color: 'var(--color-white)' }}>
              WHERE VISION <br /><span style={{ color: 'var(--color-cream)' }}>MEETS REALITY</span>
            </h2>
            <div style={{ height: 2, width: 60, background: 'var(--color-accent)', marginBottom: '2rem' }} />
            <p className="font-body text-lg md:text-xl font-light" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8 }}>
              {event.fullDescription || event.shortDescription || 'Join hundreds of developers, designers, and innovators.'}
            </p>
          </div>

          {/* Bottom: Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center p-8 rounded-2xl transition-transform hover:-translate-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <span className="font-display text-5xl mb-2 text-white">{stat.value}</span>
                <span className="font-body text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--color-sand)' }}>{stat.label}</span>
              </div>
            ))}
            
            {/* Venue Box */}
            <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center p-8 rounded-2xl transition-transform hover:-translate-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
              <p className="font-body text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--color-sand)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>
                </svg>
                Venue
              </p>
              <h3 className="font-display text-2xl m-0 leading-tight text-white text-center">{event.location.split(',')[0]}</h3>
            </div>
          </div>
        </div>
      </div>
    </SectionTransition>
  )
}
