import { useState, useRef } from 'react'
import SectionTransition from '../ui/SectionTransition'
import type { EventData, ScheduleDay, Session } from '../../mocks/types'

interface ScheduleSectionProps {
  event: EventData
}

export default function ScheduleSection({ event }: ScheduleSectionProps) {
  const [activeDay, setActiveDay] = useState<number>(0)
  const [hoverDay, setHoverDay] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const hasSchedule = event.schedule && event.schedule.length > 0

  const currentDay = hasSchedule ? (hoverDay !== null ? hoverDay : activeDay) : 0
  const dayData = hasSchedule ? event.schedule[currentDay] : null

  // Extract day number for the marker (e.g. "NOV 14" -> "14")
  const getDayNumber = (dateStr: string) => {
    const parts = dateStr.split(' ')
    return parts.length > 1 ? parts[1] : dateStr
  }

  const getDayMonth = (dateStr: string) => {
    const parts = dateStr.split(' ')
    return parts.length > 1 ? parts[0] : ''
  }

  return (
    <SectionTransition
      id="schedule"
      direction="rtl"
      numSelector=".sched-section-num"
      style={{
        background: 'var(--color-bg)',
        padding: 'var(--space-2xl) 0',
        position: 'relative',
        minHeight: '800px',
        overflow: 'hidden',
      }}
    >
      <span className="section-num sched-section-num" aria-hidden="true">02</span>
      
      {/* Faint data grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
        }}
      />

      <div className="page-container relative z-10">
        <div className="mb-16 content-backdrop">
          <p className="font-ui font-semibold tracking-widest text-xs mb-3" style={{ color: 'var(--color-primary)', letterSpacing: '0.25em' }} data-reveal>
            PROGRAMME
          </p>
          <h2 className="font-display leading-none" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', color: 'var(--color-text)' }} data-reveal>
            SCHEDULE OF <br /><span className="text-gradient-accent">EVENTS</span>
          </h2>
        </div>

        {!hasSchedule ? (
          /* ── No schedule defined yet ── */
          <div className="mt-16 flex flex-col items-center justify-center py-24 text-center" style={{ border: '1px dashed rgba(99,102,241,0.2)' }}>
            <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(99,102,241,0.6)' }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p className="font-display text-3xl text-white mb-2">SCHEDULE TBA</p>
            <p className="font-ui text-sm tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              The event timeline will be published soon. Stay tuned.
            </p>
          </div>
        ) : (
          /* ── Interactive Ribbon Timeline ── */
          <div className="relative mt-24 h-96 flex items-center justify-center">
            
            {/* The angled ribbon band */}
            <div 
              className="absolute inset-0 w-[150%] left-[-25%] h-32 origin-center"
              style={{ 
                background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.05) 20%, rgba(99,102,241,0.1) 50%, rgba(99,102,241,0.05) 80%, transparent)',
                transform: 'rotate(-8deg) translateY(20px)',
                borderTop: '1px solid rgba(99,102,241,0.1)',
                borderBottom: '1px solid rgba(99,102,241,0.1)'
              }}
            />

            {/* The connecting line */}
            <div 
              className="absolute w-[120%] left-[-10%] h-px bg-indigo-500/30"
              style={{ transform: 'rotate(-8deg) translateY(20px)' }}
            />

            {/* Markers Container */}
            <div className="relative z-20 flex gap-24 md:gap-40 items-center justify-center w-full" style={{ transform: 'rotate(-8deg) translateY(20px)' }}>
              {event.schedule.map((day: ScheduleDay, idx: number) => {
                const isActive = activeDay === idx
                const isHovered = hoverDay === idx
                const isHighlight = isActive || isHovered

                return (
                  <div 
                    key={day.day} 
                    className="relative group cursor-pointer flex flex-col items-center justify-center"
                    onMouseEnter={() => setHoverDay(idx)}
                    onMouseLeave={() => setHoverDay(null)}
                    onClick={() => setActiveDay(idx)}
                  >
                    {/* Pulsing ring for active day */}
                    {isActive && (
                      <div 
                        className="absolute rounded-full" 
                        style={{
                          width: '120px', height: '120px',
                          border: '2px solid var(--color-accent)',
                          animation: 'pulse-glow 2s infinite',
                          boxShadow: '0 0 20px rgba(34,211,238,0.2) inset'
                        }}
                      />
                    )}
                    
                    <div 
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center z-10 transition-all duration-300"
                      style={{ 
                        background: isHighlight ? 'var(--color-primary)' : 'rgba(10,10,15,0.9)',
                        border: `2px solid ${isHighlight ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}`,
                        transform: isHighlight ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isHighlight ? '0 0 30px rgba(99,102,241,0.4)' : 'none'
                      }}
                    >
                      <span className="font-ui font-bold text-xs tracking-widest text-white/50 mb-0.5">{getDayMonth(day.date).toUpperCase()}</span>
                      <span className="font-display text-4xl md:text-5xl leading-none text-white">{getDayNumber(day.date)}</span>
                    </div>
                    
                    {!isHighlight && (
                       <div className="w-px h-6 bg-white/20 mt-2" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Schedule Popover Panel */}
            {dayData && (
              <div 
                ref={popoverRef}
                className="absolute z-30 card-glass p-8 shadow-2xl transition-all duration-300"
                style={{
                  width: '90%', maxWidth: '500px',
                  right: '5%', top: '-20%',
                  background: 'rgba(17,17,24,0.95)',
                  border: '1px solid var(--color-primary)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.15)',
                  opacity: hoverDay !== null || activeDay !== null ? 1 : 0,
                  transform: `translateY(${hoverDay !== null ? '0' : '10px'})`
                }}
              >
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-display text-4xl text-white leading-none">
                      {event.schedule.length === 1 ? 'EVENT TIMELINE' : dayData.day}
                    </h3>
                    <p className="font-ui text-sm tracking-widest" style={{ color: 'var(--color-accent)' }}>{dayData.date}</p>
                  </div>
                  <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-ui text-xs tracking-widest border border-indigo-500/30">
                    {dayData.sessions.length} SESSIONS
                  </div>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {dayData.sessions.map((session: Session, i: number) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-16 shrink-0 pt-1 text-right">
                        <span className="font-display text-2xl" style={{ color: dayData.color }}>{session.time}</span>
                      </div>
                      <div className="w-px bg-white/10 relative">
                         <div className="absolute top-3 left-[-3px] w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-cyan-400 transition-colors" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-ui font-bold text-lg text-white leading-tight mb-1">{session.title}</p>
                        {session.speaker && <p className="font-body text-sm text-gray-400 mb-2">{session.speaker}</p>}
                        {session.tag && (
                          <span className="inline-block font-ui font-semibold text-[10px] tracking-widest px-2 py-0.5 rounded-sm" style={{ background: (session.tagColor || '#6366F1') + '22', color: session.tagColor || '#6366F1', border: `1px solid ${(session.tagColor || '#6366F1')}44` }}>
                            {session.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 4px;
        }
      `}} />
    </SectionTransition>
  )
}
