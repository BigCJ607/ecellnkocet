import React from 'react'

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', paddingTop: 'calc(var(--nav-h) + 4rem)' }}>
      <div className="max-w-4xl mx-auto px-6 md:px-12 xl:px-32 py-16">
        <h1 className="font-display text-7xl mb-8 text-gradient-primary">WHO WE ARE</h1>
        
        <div className="content-backdrop p-10">
          <p className="text-lg mb-6" style={{ color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            EVENT ZERO is the premier student-run organization dedicated to fostering innovation, collaboration, and technical excellence across campus. We organize the largest hackathons, design sprints, and technical workshops in the state.
          </p>
          <p className="text-lg mb-8" style={{ color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            Our mission is simple: provide a space where students can build the future. Whether you're a first-year CS student or a graduate designer, our events are structured to challenge you, connect you with industry mentors, and give you the resources to turn ideas into reality.
          </p>
          
          <div className="grid grid-cols-3 gap-6 pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div>
              <span className="font-display text-5xl text-gradient-accent">0</span>
              <span className="block font-ui text-xs tracking-widest text-gray-500 mt-2">EVENTS HOSTED</span>
            </div>
            <div>
              <span className="font-display text-5xl text-gradient-accent">0</span>
              <span className="block font-ui text-xs tracking-widest text-gray-500 mt-2">ATTENDEES</span>
            </div>
            <div>
              <span className="font-display text-5xl text-gradient-accent">0</span>
              <span className="block font-ui text-xs tracking-widest text-gray-500 mt-2">IN PRIZES</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
