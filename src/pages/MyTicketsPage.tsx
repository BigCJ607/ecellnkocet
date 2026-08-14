import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { useApp } from '../context/AppContext'
import type { UserTicket, UserProfile } from '../mocks/types'
import { eventService } from '../services/eventService'
import { profileService } from '../services/profileService'
import SubmissionPanel from '../components/layout/SubmissionPanel'

// ── Standard QR Code image component ─────────────────────────────────────────
function QRImage({ data, size = 260, className = '' }: { data: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string>('')

  useEffect(() => {
    if (!data) return
    QRCode.toDataURL(data, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#0a0a14',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setSrc(url))
      .catch(err => console.error('QRCode generation error:', err))
  }, [data, size])

  if (!src) {
    return (
      <div style={{ width: size, height: size, background: '#ffffff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #06b6d4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="QR Code Pass"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', borderRadius: 12, background: '#ffffff' }}
    />
  )
}

// ── Helper function to download Ticket Pass as PNG Image ─────────────────────
async function downloadTicketPass(ticket: UserTicket, profile: UserProfile | null) {
  const canvas = document.createElement('canvas')
  const width = 1200
  const height = 630
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#0a0a16')
  bgGrad.addColorStop(0.5, '#121226')
  bgGrad.addColorStop(1, '#080812')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Border & Glow
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'
  ctx.lineWidth = 4
  ctx.strokeRect(20, 20, width - 40, height - 40)

  // Top Accent Bar
  const topGrad = ctx.createLinearGradient(0, 0, width, 0)
  topGrad.addColorStop(0, '#6366f1')
  topGrad.addColorStop(0.5, '#06b6d4')
  topGrad.addColorStop(1, '#8b5cf6')
  ctx.fillStyle = topGrad
  ctx.fillRect(20, 20, width - 40, 8)

  // Title & Header Text
  ctx.fillStyle = '#22d3ee'
  ctx.font = 'bold 16px sans-serif'
  ctx.fillText('OFFICIAL EVENT ENTRY PASS · Ecell', 60, 75)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 44px sans-serif'
  ctx.fillText(ticket.eventTitle.toUpperCase(), 60, 135)

  // Event Date & Location
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = '20px sans-serif'
  ctx.fillText(`📅 ${ticket.date}   📍 ${ticket.location}`, 60, 180)

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 210)
  ctx.lineTo(720, 210)
  ctx.stroke()

  // Attendee Details Column
  ctx.fillStyle = '#818cf8'
  ctx.font = 'bold 18px sans-serif'
  ctx.fillText('ATTENDEE CREDENTIALS', 60, 250)

  const details = [
    { label: 'NAME', val: profile?.name || 'Student' },
    { label: 'EMAIL', val: profile?.contactEmail || 'N/A' },
    { label: 'PNR', val: profile?.pnr || 'N/A' },
    { label: 'BRANCH / YEAR', val: `${profile?.branch || 'N/A'} · ${profile?.classYear || ''}` },
    { label: 'TEAM', val: ticket.teamName || 'No Team Joined' },
    { label: 'TICKET STATUS', val: ticket.status.toUpperCase() },
    { label: 'PASS ID', val: ticket.id },
  ]

  let startY = 295
  details.forEach(({ label, val }) => {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.8)'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(`${label}:`, 60, startY)

    ctx.fillStyle = '#ffffff'
    ctx.font = '16px sans-serif'
    ctx.fillText(val, 200, startY)

    startY += 38
  })

  // Render QR Code onto Canvas Right Column
  const qrPayload = JSON.stringify({
    passId: ticket.id,
    event: ticket.eventTitle,
    date: ticket.date,
    location: ticket.location,
    status: ticket.status,
    name: profile?.name || 'Student',
    email: profile?.contactEmail || '',
    pnr: profile?.pnr || 'N/A',
    branch: profile?.branch || 'N/A',
    classYear: profile?.classYear || 'N/A',
    division: profile?.division || 'N/A',
    team: ticket.teamName || 'No Team',
  })

  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 500,
      margin: 1,
      color: { dark: '#0a0a14', light: '#ffffff' },
    })

    const qrImg = new Image()
    qrImg.src = qrDataUrl
    await new Promise(res => { qrImg.onload = res })

    // White QR Container Card
    ctx.fillStyle = '#ffffff'
    ctx.roundRect(790, 110, 340, 340, 16)
    ctx.fill()

    ctx.drawImage(qrImg, 810, 130, 300, 300)

    // QR Label
    ctx.fillStyle = '#22d3ee'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SCAN TO VERIFY ENTRY', 960, 485)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = '14px sans-serif'
    ctx.fillText('Authorized Digital Ticket', 960, 515)
    ctx.textAlign = 'left'

  } catch (e) {
    console.error('Download canvas QR error:', e)
  }

  // Trigger File Download
  const link = document.createElement('a')
  link.download = `EventPass-${ticket.eventTitle.replace(/[^a-z0-9]/gi, '_')}-${ticket.id.slice(0, 8)}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ── Premium Aesthetic QR Box Component ───────────────────────────────────────
function CoolQRBox({ data, size = 260 }: { data: string; size?: number; onClick?: () => void }) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Ambient glow orbs behind card */}
      <div style={{
        position: 'absolute', width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
        top: '10%', left: '5%', filter: 'blur(28px)', pointerEvents: 'none',
        animation: 'qrOrb1 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 160, height: 160, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)',
        bottom: '5%', right: '5%', filter: 'blur(24px)', pointerEvents: 'none',
        animation: 'qrOrb2 7s ease-in-out infinite',
      }} />

      {/* Rotating gradient border ring */}
      <div style={{
        position: 'relative', padding: 2, borderRadius: 20,
        background: 'linear-gradient(135deg, #6366f1, #22d3ee, #8b5cf6, #6366f1)',
        backgroundSize: '300% 300%',
        boxShadow: '0 0 32px rgba(99,102,241,0.35), 0 0 60px rgba(34,211,238,0.15)',
      }}>
        {/* Frosted glass inner card */}
        <div style={{
          borderRadius: 18,
          background: 'linear-gradient(145deg, rgba(18,18,32,0.97), rgba(12,12,24,0.99))',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}>
          {/* QR itself — white bg with subtle purple shadow glow */}
          <div style={{
            borderRadius: 12,
            background: '#ffffff',
            padding: 10,
            boxShadow: '0 8px 48px rgba(99,102,241,0.45), 0 2px 12px rgba(0,0,0,0.6)',
          }}>
            <QRImage data={data} size={size} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pass Card Component ──────────────────────────────────────────────────────
function PassCard({
  ticket,
  profile,
  onSubmit,
  onCancel,
  onOpenQRModal,
  cancelling,
}: {
  ticket: UserTicket
  profile: UserProfile | null
  onSubmit: (t: UserTicket) => void
  onCancel: (t: UserTicket) => void
  onOpenQRModal: (t: UserTicket) => void
  cancelling: boolean
}) {
  const [downloading, setDownloading] = useState(false)
  const canSubmit = !!ticket.submissionsEnabled && ticket.status === 'Confirmed'

  const qrPayload = JSON.stringify({
    passId: ticket.id,
    event: ticket.eventTitle,
    date: ticket.date,
    location: ticket.location,
    status: ticket.status,
    name: profile?.name || 'Student',
    email: profile?.contactEmail || '',
    pnr: profile?.pnr || 'N/A',
    branch: profile?.branch || 'N/A',
    classYear: profile?.classYear || 'N/A',
    division: profile?.division || 'N/A',
    team: ticket.teamName || 'No Team',
    role: profile?.role || 'student',
  })

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadTicketPass(ticket, profile)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(20,20,35,0.95) 0%, rgba(15,15,26,0.98) 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        transition: 'transform 0.3s, border-color 0.3s, box-shadow 0.3s',
      }}
      className="hover:border-indigo-500/40 hover:shadow-indigo-500/10"
    >
      <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 50%, #8b5cf6 100%)' }} />

      <div style={{ padding: '24px 28px' }}>
        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px',
            borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee',
            fontFamily: 'var(--font-ui)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee', animation: 'pulse 2s infinite' }} />
            {ticket.status.toUpperCase()}
          </span>

          {ticket.submissionsEnabled ? (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '4px 12px', borderRadius: 6, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontFamily: 'var(--font-ui)' }}>
              ✓ SUBMISSIONS OPEN
            </span>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)' }}>
              🔒 SUBMISSIONS CLOSED BY ADMIN
            </span>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
            {ticket.date}
          </span>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
              color: '#ffffff', margin: '0 0 10px', lineHeight: 1.1, fontWeight: 700,
            }}>
              {ticket.eventTitle}
            </h2>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {ticket.location}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-ui)', color: ticket.teamName ? '#22d3ee' : 'rgba(255,255,255,0.4)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span style={{ fontWeight: ticket.teamName ? 600 : 400 }}>
                  {ticket.teamName ? `Team: ${ticket.teamName}` : 'No Team Joined Yet'}
                </span>
              </div>
            </div>

            {profile && (
              <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#ffffff',
                  fontFamily: 'var(--font-display)',
                }}>
                  {(profile.name?.charAt(0) || '?').toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-ui)' }}>
                    {profile.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                    {[profile.branch, profile.classYear, profile.division && `Div ${profile.division}`].filter(Boolean).join(' · ')}
                  </div>
                </div>

                {profile.pnr && (
                  <div style={{
                    padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 600,
                    color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace',
                  }}>
                    PNR: {profile.pnr}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons including Download */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to={`/events/${ticket.eventId}`} style={{
                padding: '10px 18px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0', textDecoration: 'none', fontFamily: 'var(--font-ui)',
                display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View Event Details
              </Link>

              {canSubmit ? (
                <button onClick={() => onSubmit(ticket)} style={{
                  padding: '10px 20px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)',
                  color: '#22d3ee', fontFamily: 'var(--font-ui)', transition: 'all 0.2s',
                }}>
                  Submit Project
                </button>
              ) : (
                <button disabled title="Project submissions have not been opened by event admins yet" style={{
                  padding: '10px 18px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'not-allowed',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)',
                }}>
                  🔒 Submissions Closed
                </button>
              )}

              {/* Download Pass Button */}
              <button onClick={handleDownload} disabled={downloading} style={{
                padding: '10px 18px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                color: '#34d399', fontFamily: 'var(--font-ui)', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {downloading ? 'Generating PNG…' : 'Download Pass (PNG)'}
              </button>

              <button onClick={() => onOpenQRModal(ticket)} style={{
                padding: '10px 20px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.4)',
                color: '#a5b4fc', fontFamily: 'var(--font-ui)', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all 0.2s',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="4" height="4"/></svg>
                Pop Up QR
              </button>

              <button onClick={() => onCancel(ticket)} disabled={cancelling} style={{
                padding: '10px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', fontFamily: 'var(--font-ui)', marginLeft: 'auto',
              }}>
                {cancelling ? 'Cancelling…' : 'Unenroll'}
              </button>
            </div>
          </div>

          {/* Right QR Preview Box */}
          <div
            onClick={() => onOpenQRModal(ticket)}
            style={{
              padding: 14, borderRadius: 14,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            className="hover:border-cyan-400/50 hover:bg-cyan-500/5"
            title="Click to pop up cool holographic QR Code"
          >
            <div style={{ padding: 8, borderRadius: 10, background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <QRImage data={qrPayload} size={110} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#22d3ee', fontFamily: 'var(--font-ui)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                CLICK FOR POPUP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QR Code Pop Up Modal (Cool Holographic & Scannable QR Display) ──────────
function QRPassModal({
  ticket,
  profile,
  onClose,
}: {
  ticket: UserTicket
  profile: UserProfile | null
  onClose: () => void
}) {
  const [downloading, setDownloading] = useState(false)

  const qrPayload = JSON.stringify({
    passId: ticket.id,
    event: ticket.eventTitle,
    date: ticket.date,
    location: ticket.location,
    status: ticket.status,
    name: profile?.name || 'Student',
    email: profile?.contactEmail || '',
    pnr: profile?.pnr || 'N/A',
    branch: profile?.branch || 'N/A',
    classYear: profile?.classYear || 'N/A',
    division: profile?.division || 'N/A',
    team: ticket.teamName || 'No Team',
    role: profile?.role || 'student',
  })

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadTicketPass(ticket, profile)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(5,5,15,0.92)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'fadeIn 0.2s ease', cursor: 'pointer',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, borderRadius: 24, overflow: 'hidden',
          background: '#11111d',
          border: '1px solid rgba(34,211,238,0.4)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 60px rgba(34,211,238,0.2)',
          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
          cursor: 'default',
        }}
      >
        {/* Modal Top Header */}
        <div style={{
          width: '100%', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)', boxSizing: 'border-box',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.2em', color: '#22d3ee', fontWeight: 700, margin: 0 }}>
              VERIFIED ENTRY QR PASS
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#ffffff', margin: 0, fontWeight: 700 }}>
              {ticket.eventTitle}
            </h2>
          </div>

          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#ffffff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Modal Body: Premium QR */}
        <div style={{ padding: '36px 32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%', boxSizing: 'border-box' }}>
          <CoolQRBox data={qrPayload} size={240} />

          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)',
              fontFamily: 'var(--font-ui)', margin: 0,
            }}>
              All credentials encoded · Present this pass at entry
            </p>
          </div>
        </div>

        {/* Modal Footer with Download Button */}
        <div style={{
          width: '100%', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'rgba(0,0,0,0.3)', boxSizing: 'border-box',
        }}>
          <button onClick={handleDownload} disabled={downloading} style={{
            padding: '9px 18px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
            color: '#34d399', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {downloading ? 'Downloading…' : 'Download Pass (PNG)'}
          </button>

          <button onClick={onClose} style={{
            padding: '9px 20px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
            background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)',
            color: '#22d3ee', fontFamily: 'var(--font-ui)',
          }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function MyTicketsPage() {
  const { tickets, loading, user, refreshTickets } = useApp()
  const [submittingTicket, setSubmittingTicket] = useState<UserTicket | null>(null)
  const [qrModalTicket, setQrModalTicket] = useState<UserTicket | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (user?.id) {
      profileService.getProfile(user.id).then(p => { if (p) setProfile(p) })
    }
  }, [user?.id])

  const handleCancelTicket = async (ticket: UserTicket) => {
    if (!window.confirm(`Unenroll from "${ticket.eventTitle}"? Your pass will be cancelled.`)) return
    setCancellingId(ticket.id)
    try { await eventService.cancelTicket(ticket.id); await refreshTickets() }
    catch (err: any) { alert(`Failed: ${err.message}`) }
    finally { setCancellingId(null) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>ACCESS RESTRICTED</p>
      <Link to="/auth" className="btn-primary" style={{ padding: '12px 32px', textDecoration: 'none', borderRadius: 10 }}>Sign In</Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: 'var(--nav-h)', paddingBottom: '6rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes qrOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(12px,-8px) scale(1.15)} }
        @keyframes qrOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-10px,10px) scale(1.1)} }
        @keyframes borderRotate { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>

        {/* Page Header */}
        <div style={{ padding: '36px 0 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 36 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.22em', color: '#6366f1', fontWeight: 700, margin: '0 0 6px' }}>
            {user.name.toUpperCase()} · DASHBOARD
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#ffffff', margin: '0 0 8px', lineHeight: 1, fontWeight: 700 }}>
            My Passes
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {tickets.length === 0 ? 'No active registrations' : `${tickets.length} active event pass${tickets.length > 1 ? 'es' : ''} · Download pass image or view QR code`}
          </p>
        </div>

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <div style={{
            padding: '64px 40px', borderRadius: 16, border: '1px dashed rgba(99,102,241,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center',
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 1-2 2v2z"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#ffffff', margin: '0 0 8px' }}>No Passes Yet</h2>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>Register for an event to receive your digital pass.</p>
              <Link to="/" style={{ padding: '10px 28px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', textDecoration: 'none', fontFamily: 'var(--font-ui)' }}>Browse Events</Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {tickets.map((ticket) => (
              <PassCard
                key={ticket.id}
                ticket={ticket}
                profile={profile}
                onSubmit={setSubmittingTicket}
                onCancel={handleCancelTicket}
                onOpenQRModal={setQrModalTicket}
                cancelling={cancellingId === ticket.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* QR Code Pop Up Modal */}
      {qrModalTicket && (
        <QRPassModal
          ticket={qrModalTicket}
          profile={profile}
          onClose={() => setQrModalTicket(null)}
        />
      )}

      {/* Project Submission Modal */}
      {submittingTicket && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto', background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)' }}>
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
            <button onClick={() => setSubmittingTicket(null)} style={{
              position: 'absolute', top: 32, right: 32, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 18,
            }}>✕</button>
            <div style={{ width: '100%', maxWidth: 640 }}>
              <SubmissionPanel
                eventId={submittingTicket.eventId}
                eventTitle={submittingTicket.eventTitle}
                teamId={submittingTicket.teamName}
                onClose={() => setSubmittingTicket(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
