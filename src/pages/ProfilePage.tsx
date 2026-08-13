import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { UserProfile, ClassYear } from '../mocks/types'
import { profileService } from '../services/profileService'
import { authService } from '../services/authService'

const CLASS_YEARS: ClassYear[] = ['First Year', 'Second Year', 'Third Year', 'Fourth Year']

const PRESET_BRANCHES = [
  'Computer Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Electronics & Telecommunication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
]

const generateAvatarUrl = (style: string, seed: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0d0d17,1a1a2e,16213e`

const PRESET_AVATARS = [
  { id: 'bot-1', name: 'Cyber Android', url: generateAvatarUrl('bottts-neutral', 'Zephyr-9') },
  { id: 'bot-2', name: 'Neon Glitch', url: generateAvatarUrl('bottts-neutral', 'Vortex-X') },
  { id: 'bot-3', name: 'Quantum Core', url: generateAvatarUrl('bottts-neutral', 'Aegis-7') },
  { id: 'bot-4', name: 'Pulse Mech', url: generateAvatarUrl('bottts-neutral', 'Nova-Prime') },
  { id: 'shape-1', name: 'Matrix Grid', url: generateAvatarUrl('shapes', 'Hexagon') },
  { id: 'shape-2', name: 'Cyber Poly', url: generateAvatarUrl('shapes', 'Prism-Cyber') },
  { id: 'pixel-1', name: 'Pixel Hacker', url: generateAvatarUrl('pixel-art', 'Ghost-In-Shell') },
  { id: 'pixel-2', name: 'Retro Coder', url: generateAvatarUrl('pixel-art', 'Zero-One') },
]

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8,
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontFamily: 'var(--font-ui)', boxSizing: 'border-box',
  outline: 'none', transition: 'border-color 0.2s',
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [editName, setEditName] = useState('')
  const [editPnr, setEditPnr] = useState('')
  const [editYear, setEditYear] = useState<ClassYear>('First Year')
  const [editDivision, setEditDivision] = useState('')
  const [editBranch, setEditBranch] = useState('Computer Science & Engineering')
  const [editEmail, setEditEmail] = useState('')
  const [editBio, setEditBio] = useState('')

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarTab, setAvatarTab] = useState<'presets' | 'generate' | 'upload'>('presets')
  const [generatedSeed, setGeneratedSeed] = useState('')

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(true)

  useEffect(() => {
    if (!user) return
    profileService.getProfile(user.id).then(p => {
      setProfile(p)
      if (p) {
        setEditName(p.name); setEditPnr(p.pnr || ''); setEditYear(p.classYear)
        setEditDivision(p.division); setEditBranch(p.branch || 'Computer Science & Engineering')
        setEditEmail(p.contactEmail); setEditBio(p.bio || '')
        setCurrentAvatarUrl(p.avatarUrl || ''); setAvatarPreview(p.avatarUrl || '')
      } else {
        setEditName(user.name); setEditEmail(user.email)
        setCurrentAvatarUrl(''); setAvatarPreview('')
      }
      setLoading(false)
    })
  }, [user])

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file))
  }
  const handleSelectPresetAvatar = (url: string) => { setAvatarFile(null); setCurrentAvatarUrl(url); setAvatarPreview(url) }
  const handleClearAvatar = () => { setAvatarFile(null); setCurrentAvatarUrl(''); setAvatarPreview('') }
  const handleGenerateRandomAvatar = () => {
    const seed = `${editName || 'CyberHacker'}-${Math.random().toString(36).slice(2, 8)}`
    setGeneratedSeed(seed)
    const styles = ['bottts-neutral', 'shapes', 'pixel-art', 'identicon']
    const url = generateAvatarUrl(styles[Math.floor(Math.random() * styles.length)], seed)
    setAvatarFile(null); setCurrentAvatarUrl(url); setAvatarPreview(url)
  }

  const handleSave = async () => {
    if (!user) return; setSaving(true)
    try {
      let finalAvatarUrl = currentAvatarUrl
      if (avatarFile) {
        try { finalAvatarUrl = await profileService.uploadAvatar(user.id, avatarFile) }
        catch (e) { console.warn('Avatar upload failed', e) }
      }
      const updated = await profileService.updateProfile(user.id, {
        name: editName, pnr: editPnr, classYear: editYear,
        division: editDivision, branch: editBranch,
        contactEmail: editEmail, bio: editBio, avatarUrl: finalAvatarUrl || '',
      })
      setProfile(updated); setCurrentAvatarUrl(finalAvatarUrl || '')
      setAvatarPreview(finalAvatarUrl || ''); setAvatarFile(null)
      setIsEditing(false); setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      await authService.changePassword(newPassword, currentPassword || undefined)
      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 4000)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setEditName(profile.name); setEditPnr(profile.pnr || ''); setEditYear(profile.classYear)
      setEditDivision(profile.division); setEditBranch(profile.branch || 'Computer Science & Engineering')
      setEditEmail(profile.contactEmail); setEditBio(profile.bio || '')
      setCurrentAvatarUrl(profile.avatarUrl || ''); setAvatarPreview(profile.avatarUrl || '')
    }
    setAvatarFile(null); setIsEditing(false)
  }

  if (authLoading || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>ACCESS RESTRICTED</p>
      <Link to="/auth" style={{ padding: '12px 32px', textDecoration: 'none', borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>Sign In</Link>
    </div>
  )

  const viewAvatar = profile?.avatarUrl || ''
  const initials = (profile?.name || user.name || 'U').charAt(0).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: 'var(--nav-h)' }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .inp-field:focus { border-color:rgba(99,102,241,0.55)!important; }
        .av-pick:hover { transform:scale(1.1); }
        .edit-btn:hover { background:rgba(99,102,241,0.16)!important; }
      `}</style>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.22em', color: '#6366f1', fontWeight: 700, margin: '0 0 4px' }}>MY ACCOUNT</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem,5vw,3.5rem)', color: '#fff', margin: 0, lineHeight: 1 }}>Profile</h1>
        </div>

        {/* Success Banner */}
        {saveSuccess && (
          <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#22d3ee' }}>Profile saved successfully.</span>
          </div>
        )}

        {!isEditing ? (
          /* ── VIEW MODE ─────────────────────────────────────── */
          <div style={{ borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,#6366f1,#22d3ee,#8b5cf6)' }} />
            <div style={{ padding: '24px 28px' }}>

              {/* Hero Row */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 22 }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                    background: 'linear-gradient(135deg,#312e81,#0c4a6e)',
                    border: '2px solid rgba(99,102,241,0.5)',
                    boxShadow: '0 0 24px rgba(99,102,241,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {viewAvatar
                      ? <img src={viewAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: '#fff' }}>{initials}</span>
                    }
                  </div>
                  <span style={{ position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: '50%', background: '#22d3ee', border: '2px solid #0a0a14', boxShadow: '0 0 7px #22d3ee' }} />
                </div>

                {/* Name block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem,3vw,2rem)', color: '#fff', margin: 0, lineHeight: 1 }}>
                      {profile?.name || user.name}
                    </h2>
                    {profile?.pnr && (
                      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#22d3ee', padding: '3px 8px', borderRadius: 5, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}>
                        PNR: {profile.pnr}
                      </span>
                    )}
                  </div>

                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#818cf8', margin: '0 0 8px', fontWeight: 600 }}>
                    {profile?.branch || 'Branch not set'}{profile?.division ? ` · DIV ${profile.division}` : ''}
                  </p>

                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {profile?.classYear && (
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontFamily: 'var(--font-ui)' }}>
                        {profile.classYear.toUpperCase()}
                      </span>
                    )}
                    {profile?.division && (
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-ui)' }}>
                        DIVISION {profile.division.toUpperCase()}
                      </span>
                    )}
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee', fontFamily: 'var(--font-ui)' }}>
                      {user.role === 'admin' ? 'ADMINISTRATOR' : 'STUDENT'}
                    </span>
                  </div>

                  {profile?.bio && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '10px 0 0', lineHeight: 1.6, maxWidth: 460 }}>
                      {profile.bio}
                    </p>
                  )}
                </div>

                {/* Edit button */}
                <button
                  className="edit-btn"
                  onClick={() => setIsEditing(true)}
                  style={{ flexShrink: 0, padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Profile
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 18 }} />

              {/* Compact details grid — 3 cols × 2 rows */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                {[
                  { label: 'STUDENT PNR', value: profile?.pnr || '—' },
                  { label: 'CLASS YEAR', value: profile?.classYear || '—' },
                  { label: 'DIVISION', value: profile?.division || '—' },
                  { label: 'BRANCH', value: profile?.branch || '—' },
                  { label: 'CONTACT EMAIL', value: profile?.contactEmail || user.email },
                  { label: 'ACCOUNT EMAIL', value: user.email },
                ].map(({ label, value }, i) => (
                  <div key={i} style={{
                    padding: '13px 15px',
                    background: 'rgba(255,255,255,0.015)',
                    borderRight: i % 3 !== 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', fontWeight: 700, margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: value === '—' ? 'rgba(255,255,255,0.18)' : '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>{value}</p>
                  </div>
                ))}
              </div>

              {!profile && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)' }}>
                  Your profile hasn't been set up yet. Click <strong style={{ color: '#818cf8' }}>Edit Profile</strong> to get started.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── EDIT MODE ─────────────────────────────────────── */
          <div style={{ borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.25s ease' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,#6366f1,#22d3ee,#8b5cf6)' }} />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Edit header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.2em', color: '#6366f1', fontWeight: 700, margin: '0 0 3px' }}>EDITING</p>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fff', margin: 0 }}>Profile & Avatar</h2>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontFamily: 'var(--font-ui)', letterSpacing: '0.1em' }}>EDIT MODE</span>
              </div>

              {/* Avatar section */}
              <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                  {/* Preview */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#312e81,#0c4a6e)', border: '2px solid rgba(34,211,238,0.45)', boxShadow: '0 0 16px rgba(34,211,238,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#fff' }}>{initials}</span>
                      }
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 800, color: '#22d3ee', fontFamily: 'var(--font-ui)', letterSpacing: '0.08em' }}>
                      {avatarPreview ? 'SELECTED' : 'INITIALS'}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                      {[{ key: 'presets', label: 'Gallery' }, { key: 'generate', label: '🎲 Random' }, { key: 'upload', label: '📁 Upload' }].map(t => (
                        <button key={t.key} type="button" onClick={() => {
                          setAvatarTab(t.key as any)
                          if (t.key === 'generate' && !generatedSeed) handleGenerateRandomAvatar()
                          if (t.key === 'upload') fileInputRef.current?.click()
                        }} style={{
                          padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                          background: avatarTab === t.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                          border: avatarTab === t.key ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          color: avatarTab === t.key ? '#818cf8' : 'rgba(255,255,255,0.35)',
                        }}>{t.label}</button>
                      ))}
                      <button onClick={handleClearAvatar} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--font-ui)', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', marginLeft: 'auto' }}>
                        Remove
                      </button>
                    </div>

                    {avatarTab === 'presets' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5 }}>
                        {PRESET_AVATARS.map(av => (
                          <button key={av.id} className="av-pick" type="button" onClick={() => handleSelectPresetAvatar(av.url)} title={av.name} style={{ padding: 2, borderRadius: '50%', aspectRatio: '1', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', border: avatarPreview === av.url ? '2px solid #22d3ee' : '1px solid rgba(255,255,255,0.1)', boxShadow: avatarPreview === av.url ? '0 0 10px rgba(34,211,238,0.4)' : 'none', transition: 'all 0.2s' }}>
                            <img src={av.url} alt={av.name} style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
                          </button>
                        ))}
                      </div>
                    )}
                    {avatarTab === 'generate' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Generate Unique Cyber Avatar</p>
                          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Cryptographic SVG matching your profile seed</p>
                        </div>
                        <button type="button" onClick={handleGenerateRandomAvatar} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8', fontFamily: 'var(--font-ui)' }}>
                          Roll New
                        </button>
                      </div>
                    )}
                    {avatarTab === 'upload' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                          {avatarFile ? `${avatarFile.name} (${(avatarFile.size / 1024).toFixed(1)} KB)` : 'PNG, JPG or GIF'}
                        </p>
                        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', fontFamily: 'var(--font-ui)' }}>
                          Choose File
                        </button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFileUpload} />
                  </div>
                </div>
              </div>

              {/* Fields grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>DISPLAY NAME *</label>
                  <input className="inp-field" type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your full name" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>PNR / PRN</label>
                  <input className="inp-field" type="text" value={editPnr} onChange={e => setEditPnr(e.target.value.toUpperCase())} placeholder="e.g. 2024CS0129" style={{ ...inp, textTransform: 'uppercase', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>CLASS YEAR</label>
                  <div style={{ position: 'relative' }}>
                    <select className="inp-field" value={editYear} onChange={e => setEditYear(e.target.value as ClassYear)} style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
                      {CLASS_YEARS.map(y => <option key={y} value={y} style={{ background: '#0a0a0f' }}>{y}</option>)}
                    </select>
                    <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>DIVISION</label>
                  <input className="inp-field" type="text" value={editDivision} onChange={e => setEditDivision(e.target.value.toUpperCase())} placeholder="e.g. A / B / 01" style={{ ...inp, textTransform: 'uppercase' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>BRANCH / DEPARTMENT</label>
                <div style={{ position: 'relative' }}>
                  <select className="inp-field" value={editBranch} onChange={e => setEditBranch(e.target.value)} style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
                    {PRESET_BRANCHES.map(b => <option key={b} value={b} style={{ background: '#0a0a0f' }}>{b}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>CONTACT EMAIL</label>
                <input className="inp-field" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Visible to team members" style={inp} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 5 }}>SHORT BIO (OPTIONAL)</label>
                <textarea className="inp-field" value={editBio} onChange={e => setEditBio(e.target.value)} rows={2} placeholder="Your tech stack, projects, hackathon interests..." style={{ ...inp, resize: 'vertical' }} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleCancel} disabled={saving} style={{ padding: '9px 20px', fontSize: 12, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '9px 28px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.45)', color: '#818cf8', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1 }}>
                  {saving && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── SECURITY & PASSWORD MANAGEMENT CARD ─────────────────────────────────── */}
        <div style={{
          marginTop: 28,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.35s ease',
        }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg,#22d3ee,#6366f1,#a855f7)' }} />

          {/* Header */}
          <div
            onClick={() => setPasswordSectionOpen(v => !v)}
            style={{
              padding: '20px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              borderBottom: passwordSectionOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
              background: 'rgba(99,102,241,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(34,211,238,0.1)',
                border: '1px solid rgba(34,211,238,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#22d3ee',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.2em', color: '#22d3ee', fontWeight: 700, margin: '0 0 2px' }}>SECURITY & ACCESS</p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#fff', margin: 0 }}>Change Password</h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)' }}>
                {passwordSectionOpen ? 'HIDE' : 'EXPAND'}
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: 14,
                transition: 'transform 0.2s',
                transform: passwordSectionOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block',
              }}>
                ▾
              </span>
            </div>
          </div>

          {/* Form Body */}
          {passwordSectionOpen && (
            <form onSubmit={handlePasswordChange} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Success Banner */}
              {passwordSuccess && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(34,211,238,0.1)',
                  border: '1px solid rgba(34,211,238,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  animation: 'fadeIn 0.25s ease',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#22d3ee', fontWeight: 600 }}>
                    {passwordSuccess}
                  </span>
                </div>
              )}

              {/* Error Banner */}
              {passwordError && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  animation: 'fadeIn 0.25s ease',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#f87171', fontWeight: 600 }}>
                    {passwordError}
                  </span>
                </div>
              )}

              {/* Inputs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {/* Current Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)', marginBottom: 6 }}>
                    CURRENT PASSWORD (OPTIONAL)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="inp-field"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ ...inp, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                        fontSize: 13, padding: 4, display: 'flex', alignItems: 'center',
                      }}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? '👁' : '👁‍🗨'}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)' }}>
                      NEW PASSWORD *
                    </label>
                    {newPassword && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 700, color: newPassword.length >= 6 ? '#34d399' : '#f87171' }}>
                        {newPassword.length >= 6 ? '✓ 6+ chars' : 'Too short (<6)'}
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="inp-field"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      style={{ ...inp, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                        fontSize: 13, padding: 4, display: 'flex', alignItems: 'center',
                      }}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? '👁' : '👁‍🗨'}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-ui)' }}>
                      CONFIRM NEW PASSWORD *
                    </label>
                    {confirmPassword && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 700, color: newPassword === confirmPassword ? '#34d399' : '#f87171' }}>
                        {newPassword === confirmPassword ? '✓ Matches' : '✕ No match'}
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="inp-field"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      style={{ ...inp, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                        fontSize: 13, padding: 4, display: 'flex', alignItems: 'center',
                      }}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? '👁' : '👁‍🗨'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Security advice & submit */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  🔒 Use at least 6 characters with a combination of letters, numbers, and symbols for best security.
                </p>

                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  style={{
                    padding: '10px 24px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: (passwordLoading || !newPassword || !confirmPassword) ? 'default' : 'pointer',
                    background: (newPassword && confirmPassword && newPassword === confirmPassword) ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${(newPassword && confirmPassword && newPassword === confirmPassword) ? 'rgba(34,211,238,0.45)' : 'rgba(255,255,255,0.1)'}`,
                    color: (newPassword && confirmPassword && newPassword === confirmPassword) ? '#22d3ee' : 'rgba(255,255,255,0.3)',
                    fontFamily: 'var(--font-ui)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: (newPassword && confirmPassword && newPassword === confirmPassword) ? '0 0 16px rgba(34,211,238,0.2)' : 'none',
                  }}
                >
                  {passwordLoading ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Updating Password…
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
