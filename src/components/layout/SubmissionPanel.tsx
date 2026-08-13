import { useEffect, useRef, useState } from 'react'
import { useShatter } from '../../hooks/useShatter'
import type { Submission } from '../../mocks/types'
import { submissionService } from '../../services/submissionService'
import { useApp } from '../../context/AppContext'

type PanelState = 'checking' | 'already_submitted' | 'form' | 'submitting' | 'done'
type SubmitMode = 'file' | 'url'

interface SubmissionPanelProps {
  eventId: string
  eventTitle: string
  teamId?: string
  onClose?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 0,
  color: 'var(--color-text)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  padding: '0.75rem 1rem',
  outline: 'none',
  transition: 'border-color 0.2s ease',
}

export default function SubmissionPanel({ eventId, eventTitle, teamId, onClose }: SubmissionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [panelState, setPanelState] = useState<PanelState>('checking')
  const [submitMode, setSubmitMode] = useState<SubmitMode>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState<Submission | null>(null)
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [warningAcknowledged, setWarningAcknowledged] = useState(false)
  const { user } = useApp()

  const { state: shatterState, fire: shatterFire } = useShatter(
    panelRef as React.RefObject<HTMLElement>,
    () => {}
  )

  // Check if this team has already submitted
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const subs = await submissionService.getSubmissions(eventId)
        const effectiveTeamId = teamId || (user ? user.id : null)
        if (effectiveTeamId && subs.length > 0) {
          const idLower = effectiveTeamId.toLowerCase()
          // Flexible match: by teamId prop, user ID, or user name
          const found = subs.find(s =>
            (s.teamId || '').toLowerCase() === idLower ||
            (user && (s.teamId || '').toLowerCase() === user.id.toLowerCase())
          )
          if (found) {
            setExistingSubmission(found)
            setPanelState('already_submitted')
            return
          }
        }
      } catch (e) { /* ignore */ }
      setPanelState('form')
    }
    checkExisting()
  }, [eventId, teamId, user])

  const handleFile = (file: File) => {
    setErrors(prev => ({ ...prev, file: '' }))
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (submitMode === 'file' && !selectedFile) errs.file = 'Please select a file to upload'
    if (submitMode === 'url' && !urlInput.trim()) errs.url = 'Please enter a GitHub or Drive URL'
    if (submitMode === 'url' && urlInput.trim() && !urlInput.startsWith('http')) errs.url = 'Please enter a valid URL starting with http:// or https://'
    // description is optional
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitError('')
    setPanelState('submitting')

    try {
      const effectiveTeamId = teamId || (user ? user.id : 'guest')
      let submission: Submission

      if (submitMode === 'url') {
        submission = await submissionService.submitCodeOrLocal(effectiveTeamId, eventId, urlInput.trim(), description.trim())
      } else {
        submission = await submissionService.submitZipOrLocal(effectiveTeamId, eventId, selectedFile!, description.trim())
      }

      setResult(submission)
      shatterFire()
      setTimeout(() => setPanelState('done'), 1200)
    } catch (err: any) {
      console.error('Submission failed', err)
      setSubmitError(err?.message || 'Submission failed. Please try again.')
      setPanelState('form')
    }
  }

  /* ── CHECKING STATE ─────────────────────────────────────────────── */
  if (panelState === 'checking') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Checking submission status...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  /* ── ALREADY SUBMITTED STATE ─────────────────────────────────────── */
  if (panelState === 'already_submitted' && existingSubmission) {
    return (
      <div
        className="card-glass p-8 flex flex-col gap-5"
        style={{ border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.03)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(34,211,238,0.1)', border: '2px solid rgba(34,211,238,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            ✅
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#22d3ee', margin: 0 }}>SUBMISSION LOCKED IN</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#fff', margin: 0 }}>Project Already Submitted</h2>
          </div>
        </div>

        <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.14em', margin: '0 0 8px' }}>YOUR SUBMISSION</p>
          {existingSubmission.fileName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>📦</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#fff', fontWeight: 600 }}>
                {existingSubmission.fileName}
                {existingSubmission.fileSize ? ` (${formatBytes(existingSubmission.fileSize)})` : ''}
              </span>
            </div>
          )}
          {existingSubmission.repoUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🔗</span>
              <a href={existingSubmission.repoUrl.startsWith('http') ? existingSubmission.repoUrl : `https://${existingSubmission.repoUrl}`} target="_blank" rel="noreferrer"
                style={{ fontFamily: 'monospace', fontSize: 12, color: '#22d3ee', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {existingSubmission.repoUrl}
              </a>
            </div>
          )}
          {existingSubmission.description && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '8px 0 0', lineHeight: 1.6 }}>
              <em>"{existingSubmission.description}"</em>
            </p>
          )}
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '8px 0 0' }}>
            Submitted: {new Date(existingSubmission.timestamp).toLocaleString()}
          </p>
        </div>

        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fcd34d', margin: 0, lineHeight: 1.6 }}>
            ⚠️ <strong>Submissions are final.</strong> Each team can only submit once. Contact your event organizer if you need to make changes.
          </p>
        </div>

        {onClose && (
          <button onClick={onClose} style={{ padding: '10px 24px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', background: 'transparent', cursor: 'pointer' }}>
            CLOSE
          </button>
        )}
      </div>
    )
  }

  /* ── DONE STATE ─────────────────────────────────────────────── */
  if (panelState === 'done' && result) {
    return (
      <div
        className="card-glass p-10 flex flex-col items-center text-center"
        style={{
          border: '1px solid rgba(34,211,238,0.3)',
          background: 'rgba(34,211,238,0.04)',
          animation: 'fadeInUp 0.5s ease forwards',
        }}
      >
        <div
          className="w-24 h-24 mb-8 flex items-center justify-center rounded-full"
          style={{
            border: '2px solid var(--color-accent)',
            background: 'rgba(34,211,238,0.08)',
            boxShadow: '0 0 40px rgba(34,211,238,0.3)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        >
          <span className="font-display text-4xl" style={{ color: 'var(--color-accent)' }}>✓</span>
        </div>

        <h2 className="font-display mb-3" style={{ fontSize: 'clamp(2rem,6vw,3.5rem)', color: 'var(--color-text)', lineHeight: 1 }}>
          SUBMITTED.
        </h2>
        <p className="font-ui tracking-widest text-sm mb-6" style={{ color: 'var(--color-accent)', letterSpacing: '0.2em' }}>
          {eventTitle}
        </p>

        <div className="w-full mb-6 p-4 flex items-center gap-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            {result.fileName ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-ui font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
              {result.fileName || result.repoUrl || 'Project Submitted'}
            </p>
            <p className="font-ui text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {result.fileSize ? `${formatBytes(result.fileSize)} · ` : ''}
              Uploaded {new Date(result.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <span className="font-ui text-xs tracking-wider px-2 py-1 flex-shrink-0" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(34,211,238,0.2)' }}>RECEIVED</span>
        </div>

        <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          Your project is locked in. Judges will review all submissions after the deadline closes.
        </p>

        {onClose && (
          <button
            onClick={onClose}
            className="font-ui font-semibold text-sm tracking-widest px-8 py-3"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer', letterSpacing: '0.12em' }}
          >
            CLOSE
          </button>
        )}
      </div>
    )
  }

  /* ── FORM / SUBMITTING STATE ────────────────────────────────── */
  return (
    <div
      ref={panelRef}
      className="card-glass p-8"
      style={{ visibility: shatterState === 'shattering' ? 'hidden' : 'visible' }}
    >
      {/* Header */}
      <div className="mb-6">
        <p className="font-ui font-semibold tracking-widest text-xs mb-2" style={{ color: 'var(--color-primary)', letterSpacing: '0.25em' }}>
          CODE SUBMISSION · {eventTitle}
        </p>
        <h2 className="font-display leading-none" style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', color: 'var(--color-text)' }}>
          SUBMIT YOUR <span className="text-gradient-accent">PROJECT</span>
        </h2>
      </div>

      {/* ⚠️ ONE-TIME SUBMISSION WARNING */}
      {!warningAcknowledged ? (
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.06))',
            border: '1px solid rgba(245,158,11,0.45)',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fde047', margin: 0 }}>
              Read Before Submitting
            </h3>
          </div>
          <ul style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 16px', paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong style={{ color: '#fde047' }}>You can only submit once.</strong> Submissions are final and cannot be changed.</li>
            <li>Only the <strong style={{ color: '#fde047' }}>team captain</strong> can submit on behalf of the team.</li>
            <li>Make sure your project is complete and ready for judging before submitting.</li>
          </ul>
          <button
            onClick={() => setWarningAcknowledged(true)}
            style={{
              padding: '10px 24px',
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.12em',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'rgba(245,158,11,0.2)',
              border: '1px solid rgba(245,158,11,0.5)',
              color: '#fde047',
            }}
          >
            I UNDERSTAND — PROCEED TO SUBMIT
          </button>
        </div>
      ) : (
        <>
          {/* Info banner */}
          <div className="mb-5 p-4 flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="font-ui text-xs tracking-wide leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Upload any file <strong style={{ color: 'var(--color-text)' }}>(zip, pdf, etc.)</strong> or share a <strong style={{ color: 'var(--color-text)' }}>GitHub / Drive URL</strong>.
              <span style={{ color: '#f87171' }}> This submission is final — you cannot resubmit.</span>
            </p>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setSubmitMode('file')}
              style={{
                flex: 1,
                padding: '10px 0',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                border: 'none',
                background: submitMode === 'file' ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: submitMode === 'file' ? '#fff' : 'rgba(255,255,255,0.4)',
                borderRight: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.15s',
              }}
            >
              📁 UPLOAD FILE
            </button>
            <button
              type="button"
              onClick={() => setSubmitMode('url')}
              style={{
                flex: 1,
                padding: '10px 0',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                border: 'none',
                background: submitMode === 'url' ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: submitMode === 'url' ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}
            >
              🔗 SHARE URL (GitHub / Drive)
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* FILE UPLOAD MODE */}
            {submitMode === 'file' && (
              <div>
                <label className="font-ui font-semibold text-xs tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>
                  PROJECT FILE *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  disabled={panelState === 'submitting'}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-4 p-4" style={{ border: '1px solid rgba(34,211,238,0.4)', background: 'rgba(34,211,238,0.04)' }}>
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{selectedFile.name}</p>
                      <p className="font-ui text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatBytes(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      disabled={panelState === 'submitting'}
                      className="font-ui text-xs tracking-wider px-3 py-1.5 flex-shrink-0"
                      style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}
                    >
                      CHANGE
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${isDragging ? 'var(--color-accent)' : 'rgba(99,102,241,0.3)'}`,
                      background: isDragging ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.02)',
                      padding: '2.5rem 1.5rem',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                      cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    <div className="w-14 h-14 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-primary)' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-ui font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                        Drop any file here or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>browse</span>
                      </p>
                      <p className="font-ui text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Any format accepted (zip, pdf, docx...) · Max 100 MB
                      </p>
                    </div>
                  </div>
                )}
                {errors.file && <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{errors.file}</p>}
              </div>
            )}

            {/* URL MODE */}
            {submitMode === 'url' && (
              <div>
                <label className="font-ui font-semibold text-xs tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>
                  PROJECT URL (GitHub / Google Drive / Other) *
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/your-username/your-project"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  disabled={panelState === 'submitting'}
                  style={{ ...inputStyle, borderRadius: 4 }}
                  onFocus={e => Object.assign(e.target.style, { borderColor: 'var(--color-primary)' })}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                {errors.url && <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{errors.url}</p>}
                <p className="font-ui text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Make sure the link is publicly accessible (or shared with organizers).
                </p>
              </div>
            )}

            {/* Description (optional) */}
            <div>
              <label className="font-ui font-semibold text-xs tracking-widest block mb-2" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>
                PROJECT DESCRIPTION <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="submission-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100, borderRadius: 4 }}
                onFocus={e => Object.assign(e.target.style, { borderColor: 'var(--color-primary)' })}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                placeholder="What does your project do? What problem does it solve? What's your tech stack? (optional)"
                disabled={panelState === 'submitting'}
              />
              <div className="flex justify-end items-center mt-1">
                <span className="font-ui text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {description.length} chars
                </span>
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div
                className="p-4 text-sm font-ui"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 4, lineHeight: 1.5 }}
              >
                ⚠️ {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={panelState === 'submitting'}
                  className="font-ui font-semibold text-sm tracking-widest px-6 py-3"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer', letterSpacing: '0.12em' }}
                >
                  CANCEL
                </button>
              )}
              <button
                type="submit"
                disabled={panelState === 'submitting'}
                className="btn-primary flex-1 py-4 text-base flex items-center justify-center gap-3"
                style={{ opacity: panelState === 'submitting' ? 0.8 : 1, transition: 'opacity 0.2s' }}
              >
                {panelState === 'submitting' ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    SUBMIT PROJECT — FINAL
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
