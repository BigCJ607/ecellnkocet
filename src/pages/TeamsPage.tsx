import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { eventService } from '../services/eventService'
import { teamService } from '../services/teamService'
import { teamChatService } from '../services/teamChatService'
import type { EventData, Team, TeamMember, JoinRequest, TeamInvitation } from '../mocks/types'
import TeamChatModal from '../components/layout/TeamChatModal'
import InviteModal from '../components/layout/InviteModal'
import InvitesInbox from '../components/layout/InvitesInbox'

type RequestStatus = 'none' | 'pending' | 'accepted' | 'rejected'

// ── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCount({ value, color = '#22d3ee' }: { value: number; color?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let cur = 0
    const step = Math.max(1, Math.ceil(value / 20))
    const t = setInterval(() => { cur = Math.min(cur + step, value); setN(cur); if (cur >= value) clearInterval(t) }, 25)
    return () => clearInterval(t)
  }, [value])
  return <span style={{ color }}>{n}</span>
}

// ── Member Avatar with Green Dot for Captain ─────────────────────────────────
const AV_COLORS = [['#6366f1','#818cf8'],['#06b6d4','#22d3ee'],['#8b5cf6','#a78bfa'],['#ec4899','#f472b6'],['#10b981','#34d399'],['#f59e0b','#fbbf24']]

function MemberAvatar({ name, isCaptain = false, size = 34, idx = 0 }: { name: string; isCaptain?: boolean; size?: number; idx?: number }) {
  const [bg, fg] = AV_COLORS[idx % AV_COLORS.length]
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${bg}55, ${fg}33)`,
        border: `1.5px solid ${isCaptain ? '#34d399' : fg + '55'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, color: fg, flexShrink: 0,
      }}>
        {(name.charAt(0) || '?').toUpperCase()}
      </div>

      {/* Green dot for Captain (No text pill displayed) */}
      {isCaptain && (
        <span
          title="Team Captain"
          style={{
            position: 'absolute', bottom: 0, right: 0, width: 9, height: 9,
            borderRadius: '50%', background: '#34d399', border: '1.5px solid #0f172a',
            boxShadow: '0 0 6px #34d399',
          }}
        />
      )}
    </div>
  )
}

// ── Capacity Ring ─────────────────────────────────────────────────────────────
function CapacityRing({ current, max }: { current: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100)
  const color = current >= max ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#22d3ee'
  const r = 16, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={40} height={40} viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease', filter: `drop-shadow(0 0 4px ${color}88)` }} />
        <text x={20} y={20} textAnchor="middle" dominantBaseline="central" style={{ fill: 'white', fontSize: 9, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '20px 20px' }}>{current}/{max}</text>
      </svg>
      <div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', marginBottom: 2 }}>ROSTER</div>
        <div style={{ fontSize: 12, color, fontWeight: 600, fontFamily: 'var(--font-body)' }}>{current >= max ? 'Full' : `${max - current} open`}</div>
      </div>
    </div>
  )
}

// ── Requests Panel for Team Captain ──────────────────────────────────────────
function RequestsPanel({ requests, onAccept, onReject, loading }: {
  requests: JoinRequest[]
  onAccept: (r: JoinRequest) => void
  onReject: (r: JoinRequest) => void
  loading: string | null
}) {
  if (!requests.length) return null
  return (
    <div style={{ marginBottom: 24, padding: '18px 22px', borderRadius: 14, backgroundColor: 'var(--color-white)', border: '1px solid rgba(245,158,11,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-dusty-blue)', display: 'inline-block', boxShadow: '0 0 10px #f59e0b' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--color-dusty-blue)', fontFamily: 'var(--font-body)' }}>
          PENDING JOIN APPLICATIONS ({requests.length})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map((req, i) => (
          <div key={req.id} style={{ padding: '14px 16px', borderRadius: 10, backgroundColor: 'var(--color-white)', border: '1px solid var(--color-cream)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <MemberAvatar name={req.userName || '?'} size={38} idx={i} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>{req.userName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)' }}>
                    {[req.userBranch, req.userYear].filter(Boolean).join(' · ')}{req.userPnr && ` · PNR ${req.userPnr}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onAccept(req)} disabled={loading === req.id} style={{
                  padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
                  background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(62,88,104,0.4)', color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)',
                }}>
                  {loading === req.id ? '...' : 'Accept'}
                </button>
                <button onClick={() => onReject(req)} disabled={loading === req.id} style={{
                  padding: '7px 16px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
                  backgroundColor: 'transparent', border: '1px solid var(--color-sand)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
                }}>
                  {loading === req.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>

            {/* Application Skills & Pitch Note */}
            {(req.requestedRole || req.userSkills || req.userPitch) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {req.requestedRole && (
                  <div style={{ fontSize: 11, color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)' }}>
                    <strong>Applying for Role:</strong> {req.requestedRole}
                  </div>
                )}
                {req.userSkills && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)' }}>
                    <strong>Applicant Skills:</strong> {req.userSkills}
                  </div>
                )}
                {req.userPitch && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                    "{req.userPitch}"
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Team Card Component ──────────────────────────────────────────────────────
function TeamCard({
  team,
  members,
  isMyTeam,
  isCaptain,
  maxSize,
  requestStatus,
  myRequestId,
  isEnrolled,
  eventId,
  userAlreadyHasTeam,
  captainId,
  onRequestJoin,
  onCancelRequest,
  onLeave,
  onKillTeam,
  onTransferCaptaincy,
  onOpenChat,
  onInvite,
  onShareLink,
  actionLoading,
  index,
}: {
  team: Team
  members: TeamMember[]
  isMyTeam: boolean
  isCaptain: boolean
  maxSize: number
  requestStatus: RequestStatus
  myRequestId?: string
  isEnrolled: boolean
  eventId: string
  userAlreadyHasTeam: boolean
  captainId?: string
  onRequestJoin: (team: Team, role?: string) => void
  onCancelRequest: (rid: string, tid: string) => void
  onLeave: (id: string) => void
  onKillTeam: (id: string) => void
  onTransferCaptaincy: (team: Team) => void
  onOpenChat?: (team: Team, members: TeamMember[]) => void
  onInvite?: () => void
  onShareLink?: () => void
  actionLoading: boolean
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const full = team.memberCount >= maxSize
  const isMine = isMyTeam || isCaptain
  const accent = isCaptain ? '#22d3ee' : isMyTeam ? '#818cf8' : full ? '#475569' : '#34d399'

  const renderAction = () => {
    // Captain Action: Kill Team or Transfer Captaincy (Cannot simply leave)
    if (isCaptain) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onOpenChat && onOpenChat(team, members)}
            style={{
              padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
              backgroundColor: 'rgba(62,88,104,0.12)', border: '1px solid rgba(62,88,104,0.4)',
              color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            💬 Team Chat
          </button>

          {/* ── Invite Members ── */}
          <button
            onClick={() => onInvite && onInvite()}
            style={{
              padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
              background: 'rgba(129,140,248,0.14)', border: '1px solid rgba(129,140,248,0.45)',
              color: '#a5b4fc', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
            title="Search and invite platform users"
          >
            ✉ Invite Members
          </button>

          {/* ── Share Team Link ── */}
          <button
            onClick={() => onShareLink && onShareLink()}
            style={{
              padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)',
              color: '#4ade80', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
            title="Copy shareable invite link"
          >
            🔗 Share Link
          </button>

          {members.length > 1 && (
            <button
              onClick={() => onTransferCaptaincy(team)}
              disabled={actionLoading}
              style={{
                padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.4)',
                color: '#a5b4fc', fontFamily: 'var(--font-body)',
              }}
              title="Transfer Captaincy to a teammate before leaving"
            >
              Transfer Captain
            </button>
          )}
          <button
            onClick={() => onKillTeam(team.id)}
            disabled={actionLoading}
            style={{
              padding: '7px 14px', fontSize: 11, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
              backgroundColor: 'transparent', border: '1px solid var(--color-sand)',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
            }}
            title="Kill and delete team"
          >
            {actionLoading ? '...' : 'Kill Team'}
          </button>
        </div>
      )
    }

    // Teammate Action
    if (isMyTeam) {
      return (
        <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onOpenChat && onOpenChat(team, members)}
            style={{
              padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
              backgroundColor: 'rgba(62,88,104,0.12)', border: '1px solid rgba(62,88,104,0.4)',
              color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            💬 Team Chat
          </button>
          <button onClick={() => onLeave(team.id)} disabled={actionLoading} style={{ padding: '7px 16px', fontSize: 11, fontWeight: 600, borderRadius: 7, cursor: 'pointer', backgroundColor: 'transparent', border: '1px solid var(--color-sand)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {actionLoading ? '...' : 'Leave Team'}
          </button>
        </div>
      )
    }

    if (!isEnrolled) {
      return (
        <Link to={`/events/${eventId}`} onClick={e => e.stopPropagation()} style={{ padding: '7px 16px', fontSize: 11, fontWeight: 600, borderRadius: 7, backgroundColor: 'rgba(62,88,104,0.08)', border: '1px solid rgba(34,211,238,0.3)', color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)', textDecoration: 'none', display: 'inline-block' }}>
          Enroll First
        </Link>
      )
    }

    if (userAlreadyHasTeam) {
      return (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
          In Another Team
        </span>
      )
    }

    if (requestStatus === 'pending') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
          <span style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--color-dusty-blue)', fontFamily: 'var(--font-body)' }}>
            Request Pending
          </span>
          {myRequestId && (
            <button onClick={e => { e.stopPropagation(); onCancelRequest(myRequestId, team.id) }} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
          )}
        </div>
      )
    }

    if (requestStatus === 'rejected') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Rejected</span>
          {!full && (
            <button onClick={e => { e.stopPropagation(); onRequestJoin(team) }} style={{ fontSize: 10, color: 'var(--color-slate-blue)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)' }}>
              Retry
            </button>
          )}
        </div>
      )
    }

    return (
      <button onClick={e => { e.stopPropagation(); onRequestJoin(team) }} disabled={actionLoading || full} style={{
        padding: '8px 20px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: full ? 'not-allowed' : 'pointer',
        background: full ? 'rgba(255,255,255,0.03)' : 'rgba(34,211,238,0.12)',
        border: `1px solid ${full ? 'rgba(255,255,255,0.08)' : 'rgba(34,211,238,0.4)'}`,
        color: full ? '#475569' : '#22d3ee', fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
      }}>
        {actionLoading ? '...' : full ? 'Team Full' : 'Request to Join'}
      </button>
    )
  }

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden',
        backgroundColor: hovered ? 'var(--color-bg)' : 'var(--color-white)',
        border: '1px solid var(--color-sand)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.05)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        animation: `cardIn 0.4s ease ${index * 60}ms both`,
      }}
    >
      {/* Accent left bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${accent}, ${accent}44)`, borderRadius: '16px 0 0 16px', opacity: isMine || hovered ? 1 : 0.4 }} />

      <div style={{ padding: '22px 24px 22px 28px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
              {/* NO text pill for captain — small green dot will show on captain avatar */}
              {isMyTeam && !isCaptain && (
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', padding: '3px 8px', borderRadius: 4, background: 'rgba(129,140,248,0.12)', color: '#a5b4fc', border: '1px solid rgba(129,140,248,0.3)', fontFamily: 'var(--font-body)' }}>MY TEAM</span>
              )}
              {!isMine && (
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', padding: '3px 8px', borderRadius: 4, background: full ? 'rgba(71,85,105,0.15)' : 'rgba(52,211,153,0.1)', color: full ? '#64748b' : '#34d399', border: `1px solid ${full ? 'rgba(71,85,105,0.2)' : 'rgba(52,211,153,0.25)'}`, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {!full && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 5px #34d399' }} />}
                  {full ? 'FULL' : 'OPEN TO JOIN'}
                </span>
              )}
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: hovered ? accent : '#fff', margin: 0, lineHeight: 1.1, transition: 'color 0.2s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {team.name}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {renderAction()}
          </div>
        </div>

        {/* Skills & Achievements Tags (Optional) */}
        {(team.skills || team.achievements) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, fontSize: 11, fontFamily: 'var(--font-body)' }}>
            {team.skills && (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Required/Team Skills:</strong> {team.skills}
              </span>
            )}
            {team.achievements && (
              <span style={{ color: 'var(--color-dusty-blue)' }}>
                🏆 <strong>Achievements:</strong> {team.achievements}
              </span>
            )}
          </div>
        )}

        {/* Open Roles Listing */}
        {team.openRoles && team.openRoles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: 6 }}>
              OPEN ROLES IN TEAM:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {team.openRoles.map((role, rIdx) => (
                <span
                  key={rIdx}
                  onClick={(e) => {
                    if (!isMine && isEnrolled && !userAlreadyHasTeam) {
                      e.stopPropagation()
                      onRequestJoin(team, role)
                    }
                  }}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                    backgroundColor: 'rgba(62,88,104,0.08)', border: '1px solid rgba(62,88,104,0.25)',
                    color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)', cursor: (!isMine && isEnrolled && !userAlreadyHasTeam) ? 'pointer' : 'default',
                  }}
                  title={(!isMine && isEnrolled && !userAlreadyHasTeam) ? `Apply for ${role} role` : undefined}
                >
                  + {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Members & Capacity */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
              {members.slice(0, 5).reverse().map((m, i) => {
                const isMemberCaptain = m.userId === team.createdBy
                return (
                  <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: i }}>
                    <MemberAvatar name={m.userName || '?'} isCaptain={isMemberCaptain} size={34} idx={members.indexOf(m)} />
                  </div>
                )
              })}
            </div>
            {members.length > 5 && (
              <div style={{ marginLeft: -10, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                +{members.length - 5}
              </div>
            )}
            {members.length === 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)' }}>No members yet</span>}
          </div>
          <CapacityRing current={team.memberCount} max={maxSize} />
        </div>

        {/* Expand footer */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 11, color: expanded ? accent : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
          <span>{expanded ? 'Hide roster' : `View ${members.length} member${members.length !== 1 ? 's' : ''}`}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Expanded roster */}
        {expanded && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map((m, i) => {
              const isMemberCaptain = m.userId === team.createdBy
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', animation: `cardIn 0.2s ease ${i * 40}ms both` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MemberAvatar name={m.userName || '?'} isCaptain={isMemberCaptain} size={28} idx={i} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>{m.userName}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)' }}>
                    {[m.userBranch, m.userYear, m.userDivision && `Div ${m.userDivision}`].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Join Request Modal (Prompts for Skills & Pitch to Captain) ────────────────
function JoinRequestModal({
  team,
  selectedRole,
  onClose,
  onSubmit,
  submitting,
}: {
  team: Team
  selectedRole?: string
  onClose: () => void
  onSubmit: (skills: string, pitch: string, role: string) => Promise<void>
  submitting: boolean
}) {
  const [skills, setSkills] = useState('')
  const [pitch, setPitch] = useState('')
  const [role, setRole] = useState(selectedRole || '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await onSubmit(skills.trim(), pitch.trim(), role.trim())
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(251,249,244,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 500, borderRadius: 20, overflow: 'hidden',
        backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-sand)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: 28, boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--color-slate-blue)', fontWeight: 700, margin: 0 }}>JOIN REQUEST</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-text-primary)', margin: 0 }}>Apply to {team.name}</h3>
          </div>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
              TARGET ROLE (OPTIONAL)
            </label>
            <input
              type="text" value={role} onChange={e => setRole(e.target.value)}
              placeholder="e.g. Frontend Developer, Designer..."
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 8, backgroundColor: 'var(--color-white)', border: '1px solid var(--color-cream)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
              YOUR SKILLS & EXPERIENCE (OPTIONAL)
            </label>
            <input
              type="text" value={skills} onChange={e => setSkills(e.target.value)}
              placeholder="e.g. React, Node.js, Python, Figma, Supabase..."
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 8, backgroundColor: 'var(--color-white)', border: '1px solid var(--color-cream)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
              MESSAGE TO TEAM CAPTAIN (OPTIONAL)
            </label>
            <textarea
              rows={3} value={pitch} onChange={e => setPitch(e.target.value)}
              placeholder="Tell the captain why you'd be a great fit for the team..."
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 8, backgroundColor: 'var(--color-white)', border: '1px solid var(--color-cream)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', fontSize: 12, borderRadius: 8, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={{ padding: '9px 22px', fontSize: 12, fontWeight: 700, borderRadius: 8, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(62,88,104,0.4)', color: 'var(--color-slate-blue)', cursor: 'pointer' }}>
              {submitting ? 'Sending...' : 'Send Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Transfer Captaincy Modal ──────────────────────────────────────────────────
function TransferCaptainModal({
  team,
  members,
  currentUserId,
  onClose,
  onTransfer,
}: {
  team: Team
  members: TeamMember[]
  currentUserId: string
  onClose: () => void
  onTransfer: (newCaptainId: string) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const candidates = members.filter(m => m.userId !== currentUserId)

  const handleTransfer = async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      await onTransfer(selectedId)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(251,249,244,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, borderRadius: 20, overflow: 'hidden',
        backgroundColor: 'var(--color-bg)', border: '1px solid rgba(99,102,241,0.4)',
        padding: 24, boxSizing: 'border-box',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Transfer Captaincy</h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
          Select a teammate to make them Captain of "{team.name}" before leaving.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {candidates.map(m => (
            <div
              key={m.userId}
              onClick={() => setSelectedId(m.userId)}
              style={{
                padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                background: selectedId === m.userId ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedId === m.userId ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>{m.userName}</span>
              {selectedId === m.userId && <span style={{ fontSize: 11, color: 'var(--color-slate-blue)', fontWeight: 700 }}>Selected Captain</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 12, borderRadius: 8, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleTransfer} disabled={!selectedId || loading} style={{ padding: '8px 20px', fontSize: 12, fontWeight: 700, borderRadius: 8, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', cursor: selectedId ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Transferring...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Teams Page Component ─────────────────────────────────────────────────
export default function TeamsPage() {
  const { user, tickets } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventData[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({})
  const [myTeam, setMyTeam] = useState<Team | null>(null)

  const [loading, setLoading] = useState(true)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [requestStatuses, setRequestStatuses] = useState<Record<string, RequestStatus>>({})
  const [requestIds, setRequestIds] = useState<Record<string, string>>({})
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([])
  const [reqActionLoading, setReqActionLoading] = useState<string | null>(null)

  // Create team state (with optional skills, achievements, open roles)
  const [showCreate, setShowCreate] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSkills, setNewTeamSkills] = useState('')
  const [newTeamAchievements, setNewTeamAchievements] = useState('')
  const [newTeamOpenRoles, setNewTeamOpenRoles] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  // Modal States
  const [joinModalTeam, setJoinModalTeam] = useState<{ team: Team; role?: string } | null>(null)
  const [transferModalTeam, setTransferModalTeam] = useState<Team | null>(null)
  const [activeChatTeam, setActiveChatTeam] = useState<{ team: Team; members: TeamMember[] } | null>(null)
  const [myTeamUnread, setMyTeamUnread] = useState(0)
  const [submittingJoin, setSubmittingJoin] = useState(false)

  // Invite modal state (captain)
  const [inviteModalTeam, setInviteModalTeam] = useState<Team | null>(null)
  // Invitations inbox (invitee)
  const [myInvitations, setMyInvitations] = useState<TeamInvitation[]>([])
  // Share link toast
  const [linkCopied, setLinkCopied] = useState(false)
  const linkCopiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'recruiting' | 'myteam'>('all')

  useEffect(() => {
    eventService.getAllEvents().then(all => {
      const upcoming = all.filter(e => !e.isPast)
      setEvents(upcoming)

      // Handle ?join=teamId&event=eventId URL param (shared invite link)
      const params = new URLSearchParams(location.search)
      const joinEventId = params.get('event')
      const target = joinEventId ? upcoming.find(e => e.id === joinEventId) : upcoming[0]
      if (target) setSelectedEvent(target)
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll invitations for logged-in user
  useEffect(() => {
    if (!user?.id) return
    let mounted = true
    const poll = async () => {
      try {
        const invs = await teamService.getMyInvitations(user.id)
        if (mounted) setMyInvitations(invs)
      } catch { /* silent */ }
    }
    poll()
    const iv = setInterval(poll, 30000)
    return () => { mounted = false; clearInterval(iv) }
  }, [user?.id])

  // After teams load: if ?join=teamId URL param, auto-open that team's join modal
  const joinParamHandled = useRef(false)
  useEffect(() => {
    if (joinParamHandled.current || teamsLoading || !teams.length) return
    const params = new URLSearchParams(location.search)
    const joinTeamId = params.get('join')
    if (!joinTeamId) return
    joinParamHandled.current = true
    const target = teams.find(t => t.id === joinTeamId)
    if (target && !myTeam) {
      setJoinModalTeam({ team: target })
    }
    // Strip the query params from URL without refresh
    navigate('/teams', { replace: true })
  }, [teamsLoading, teams, myTeam, location.search, navigate])

  // Poll unread message count for myTeam
  useEffect(() => {
    if (!myTeam || !user?.id) {
      setMyTeamUnread(0)
      return
    }
    let isMounted = true
    const checkUnread = async () => {
      const count = await teamChatService.getUnreadCount(myTeam.id, user.id)
      if (isMounted) setMyTeamUnread(count)
    }
    checkUnread()
    const interval = setInterval(checkUnread, 3000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [myTeam?.id, user?.id])

  const loadTeamsForEvent = useCallback(async (event: EventData) => {
    if (!event || !user) return
    setTeamsLoading(true); setError(''); setMyTeam(null); setTeams([]); setTeamMembers({})
    setRequestStatuses({}); setRequestIds({}); setPendingRequests([])
    setShowCreate(false); setNewTeamName(''); setNewTeamSkills(''); setNewTeamAchievements(''); setNewTeamOpenRoles(''); setCreateError('')

    const [allTeams, userTeam] = await Promise.all([
      teamService.getTeamsForEvent(event.id),
      teamService.getUserTeamForEvent(event.id, user.id),
    ])
    setTeams(allTeams); setMyTeam(userTeam)

    const mm: Record<string, TeamMember[]> = {}
    await Promise.all(allTeams.map(async t => { mm[t.id] = await teamService.getTeamMembers(t.id) }))
    setTeamMembers(mm)

    if (!userTeam && allTeams.length > 0) {
      const statuses = await teamService.getMyRequestStatuses(allTeams.map(t => t.id), user.id)
      const sm: Record<string, RequestStatus> = {}
      allTeams.forEach(t => { sm[t.id] = (statuses[t.id] as RequestStatus) || 'none' })
      setRequestStatuses(sm)

      const pendingIds = allTeams.filter(t => statuses[t.id] === 'pending').map(t => t.id)
      if (pendingIds.length > 0) {
        const { data } = await (await import('../lib/supabase')).supabase.from('team_join_requests').select('id, team_id').eq('user_id', user.id).in('team_id', pendingIds).eq('status', 'pending')
        const idMap: Record<string, string> = {}; (data || []).forEach((r: any) => { idMap[r.team_id] = r.id }); setRequestIds(idMap)
      }
    }

    const mine = allTeams.filter(t => t.createdBy === user.id)
    if (mine.length > 0) {
      const reqs: JoinRequest[] = []
      await Promise.all(mine.map(async t => {
        const rs = await teamService.getRequestsForTeam(t.id)
        reqs.push(...rs.map(r => ({ ...r, teamName: t.name })))
      }))
      setPendingRequests(reqs)
    }

    setTeamsLoading(false)
  }, [user])

  useEffect(() => { if (selectedEvent) loadTeamsForEvent(selectedEvent) }, [selectedEvent, loadTeamsForEvent])

  const isEnrolled = (eid: string) => tickets.some(t => t.eventId === eid)

  const act = async (fn: () => Promise<void>, tid: string) => {
    setActionLoading(tid); setError('')
    try { await fn(); await loadTeamsForEvent(selectedEvent!) }
    catch (e: any) { setError(e.message) }
    finally { setActionLoading(null) }
  }

  const handleOpenJoinModal = (team: Team, role?: string) => {
    setJoinModalTeam({ team, role })
  }

  const handleSendJoinRequestWithSkills = async (skills: string, pitch: string, role: string) => {
    if (!user || !selectedEvent || !joinModalTeam) return
    setSubmittingJoin(true)
    try {
      await teamService.sendJoinRequest(joinModalTeam.team.id, user.id, selectedEvent.id, {
        userSkills: skills,
        userPitch: pitch,
        requestedRole: role,
      })
      setJoinModalTeam(null)
      await loadTeamsForEvent(selectedEvent)
    } catch (e: any) {
      throw e
    } finally {
      setSubmittingJoin(false)
    }
  }

  const handleCancelRequest = (rid: string, tid: string) => act(() => teamService.cancelRequest(rid), tid)

  const handleShareLink = (team: Team) => {
    const url = `${window.location.origin}/teams?join=${team.id}&event=${selectedEvent?.id || ''}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      if (linkCopiedTimer.current) clearTimeout(linkCopiedTimer.current)
      linkCopiedTimer.current = setTimeout(() => setLinkCopied(false), 2500)
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
      setLinkCopied(true)
      if (linkCopiedTimer.current) clearTimeout(linkCopiedTimer.current)
      linkCopiedTimer.current = setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  const handleLeave = (tid: string) => {
    if (myTeam && myTeam.createdBy === user?.id) {
      setError('As Captain, you cannot leave the team. Please kill the team or transfer captaincy first.')
      return
    }
    if (!window.confirm('Leave this team?')) return
    act(() => teamService.leaveTeam(tid, user!.id), tid)
  }

  const handleKillTeam = (tid: string) => {
    if (!window.confirm('Kill team? This will delete the team and unassign all members. Cannot be undone.')) return
    act(() => teamService.deleteTeam(tid, user!.id), tid)
  }

  const handleTransferCaptaincy = async (newCaptainId: string) => {
    if (!transferModalTeam || !user) return
    await act(async () => {
      await teamService.transferCaptaincy(transferModalTeam.id, user.id, newCaptainId)
      await teamService.leaveTeam(transferModalTeam.id, user.id)
    }, transferModalTeam.id)
  }

  const handleAcceptRequest = async (req: JoinRequest) => {
    setReqActionLoading(req.id); setError('')
    try {
      await teamService.acceptRequest(req.id, req.teamId, req.userId, selectedEvent!.maxTeamSize ?? 4)
      await loadTeamsForEvent(selectedEvent!)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setReqActionLoading(null)
    }
  }

  const handleRejectRequest = async (req: JoinRequest) => {
    setReqActionLoading(req.id); setError('')
    try {
      await teamService.rejectRequest(req.id)
      await loadTeamsForEvent(selectedEvent!)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setReqActionLoading(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedEvent || !newTeamName.trim()) { setCreateError('Team name is required.'); return }
    if (myTeam) { setCreateError('You can only create or belong to 1 team per event.'); return }
    if (newTeamName.trim().length < 2) { setCreateError('Minimum 2 characters.'); return }

    setCreating(true); setCreateError('')
    try {
      const parsedRoles = newTeamOpenRoles.split(',').map(s => s.trim()).filter(Boolean)
      await teamService.createTeam(selectedEvent.id, newTeamName.trim(), user.id, {
        skills: newTeamSkills.trim(),
        achievements: newTeamAchievements.trim(),
        openRoles: parsedRoles,
      })
      setShowCreate(false); setNewTeamName(''); setNewTeamSkills(''); setNewTeamAchievements(''); setNewTeamOpenRoles('')
      await loadTeamsForEvent(selectedEvent)
    } catch (e: any) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
    }
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>ACCESS RESTRICTED</p>
      <Link to="/auth" className="btn-primary" style={{ padding: '12px 32px', textDecoration: 'none', borderRadius: 10 }}>Sign In</Link>
    </div>
  )

  const filtered = teams.filter(t => {
    const q = searchQuery.toLowerCase().trim()
    if (q && !t.name.toLowerCase().includes(q) && !(teamMembers[t.id] || []).some(m => m.userName?.toLowerCase().includes(q))) return false
    if (filterMode === 'recruiting') return t.memberCount < (selectedEvent?.maxTeamSize ?? 4)
    if (filterMode === 'myteam') return myTeam?.id === t.id
    return true
  })
  const openCount = teams.filter(t => t.memberCount < (selectedEvent?.maxTeamSize ?? 4)).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: 'var(--nav-h)' }}>
      <style>{`
        @keyframes cardIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .ev-btn:hover { border-color:rgba(34,211,238,0.3)!important; color:#22d3ee!important; }
        .filter-btn:hover { color:#fff!important; }
        .focus-cyan:focus { border-color:rgba(34,211,238,0.55)!important; outline:none; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Header */}
        <div style={{ padding: '28px 0 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--color-slate-blue)', fontWeight: 700, margin: '0 0 4px' }}>COLLABORATION HUB</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--color-text-primary)', lineHeight: 1, margin: 0 }}>Teams & Rosters</h1>
          </div>

          {selectedEvent && !teamsLoading && (
            <div style={{ display: 'flex', gap: 28 }}>
              {[{ label: 'TEAMS', value: teams.length, color: '#818cf8' }, { label: 'OPEN', value: openCount, color: '#34d399' }, { label: 'MAX/TEAM', value: selectedEvent.maxTeamSize ?? 4, color: 'var(--color-slate-blue)' }].map(s => (
                <div key={s.label} style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1 }}><AnimatedCount value={s.value} color={s.color} /></div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Sidebar Event Selector */}
          <div style={{ position: 'sticky', top: 'calc(var(--nav-h) + 16px)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', fontWeight: 700, marginBottom: 10 }}>SELECT EVENT</p>
            {loading ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 16 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #22d3ee', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)' }}>Loading…</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map(ev => {
                  const enrolled = isEnrolled(ev.id), active = selectedEvent?.id === ev.id
                  return (
                    <button key={ev.id} className="ev-btn" onClick={() => { setSelectedEvent(ev); setSearchQuery(''); setFilterMode('all') }} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', background: active ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.02)', border: active ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(255,255,255,0.05)', borderLeft: active ? '3px solid #22d3ee' : undefined, transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: active ? '#22d3ee' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0, background: enrolled ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.05)', color: enrolled ? '#22d3ee' : 'rgba(255,255,255,0.3)', border: enrolled ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}>{enrolled ? 'IN' : 'GUEST'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)' }}>{ev.date} · {ev.maxTeamSize ?? 4} max</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Workspace */}
          <div>
            {!selectedEvent ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Select an event</p>
              </div>
            ) : (
              <>
                 {/* ── Invitations Inbox Banner ── */}
                 {user && myInvitations.length > 0 && (
                   <InvitesInbox
                     invitations={myInvitations}
                     userId={user.id}
                     maxTeamSize={selectedEvent.maxTeamSize ?? 4}
                     onUpdate={async () => {
                       const invs = await teamService.getMyInvitations(user.id)
                       setMyInvitations(invs)
                       await loadTeamsForEvent(selectedEvent)
                     }}
                   />
                 )}

                 {/* ── Link Copied Toast ── */}
                 {linkCopied && (
                   <div style={{
                     position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                     zIndex: 999,
                     padding: '12px 24px',
                     borderRadius: 12,
                     background: 'rgba(34,197,94,0.18)',
                     border: '1px solid rgba(34,197,94,0.5)',
                     color: '#4ade80',
                     fontFamily: 'var(--font-body)',
                     fontSize: 13,
                     fontWeight: 700,
                     backdropFilter: 'blur(10px)',
                     boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                     animation: 'cardIn 0.3s ease',
                   }}>
                     🔗 Invite link copied to clipboard!
                   </div>
                 )}

                {/* Guest Banner */}
                {!isEnrolled(selectedEvent.id) && (
                  <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 10, background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Viewing as guest — {selectedEvent.title}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Enroll to create or join a team</p>
                      </div>
                    </div>
                    <Link to={`/events/${selectedEvent.id}`} style={{ padding: '7px 16px', fontSize: 11, fontWeight: 600, borderRadius: 7, background: 'rgba(34,211,238,0.1)', border: '1px solid var(--color-sand)', color: 'var(--color-slate-blue)', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>Enroll →</Link>
                  </div>
                )}

                {/* Event Workspace Top Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', margin: '0 0 3px' }}>EVENT</p>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-text-primary)', margin: 0 }}>{selectedEvent.title}</h2>
                  </div>

                  {/* 1 Team per User Limit enforcement */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {myTeam ? (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ padding: '7px 14px', fontSize: 11, fontWeight: 600, borderRadius: 8, backgroundColor: 'rgba(62,88,104,0.08)', border: '1px solid rgba(62,88,104,0.25)', color: 'var(--color-slate-blue)', fontFamily: 'var(--font-body)' }}>
                          {myTeam.createdBy === user.id ? `🟢 Captain of "${myTeam.name}"` : `✓ In Team "${myTeam.name}"`}
                        </span>
                        <button
                          onClick={() => {
                            setActiveChatTeam({ team: myTeam, members: teamMembers[myTeam.id] || [] })
                            teamChatService.markAsRead(myTeam.id, user.id)
                            setMyTeamUnread(0)
                          }}
                          style={{
                            padding: '7px 16px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                            background: myTeamUnread > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.18)',
                            border: myTeamUnread > 0 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(99,102,241,0.45)',
                            color: myTeamUnread > 0 ? '#f87171' : '#a5b4fc', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s',
                          }}
                        >
                          💬 Team Chat
                          {myTeamUnread > 0 && (
                            <span style={{ padding: '1px 6px', borderRadius: 10, background: '#ef4444', color: 'var(--color-text-primary)', fontSize: 10, fontWeight: 800, boxShadow: '0 0 8px #ef4444', animation: 'pulse 2s infinite' }}>
                              {myTeamUnread}
                            </span>
                          )}
                        </button>
                      </div>
                    ) : (
                      isEnrolled(selectedEvent.id) && (
                        <button onClick={() => setShowCreate(v => !v)} style={{ padding: '9px 20px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer', background: showCreate ? 'rgba(255,255,255,0.05)' : 'rgba(34,211,238,0.12)', border: `1px solid ${showCreate ? 'rgba(255,255,255,0.12)' : 'rgba(34,211,238,0.4)'}`, color: showCreate ? 'rgba(255,255,255,0.5)' : '#22d3ee', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', transition: 'all 0.2s' }}>
                          {showCreate ? '✕ Cancel' : '+ Create Team'}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Pending Requests for Captain */}
                {pendingRequests.length > 0 && <RequestsPanel requests={pendingRequests} onAccept={handleAcceptRequest} onReject={handleRejectRequest} loading={reqActionLoading} />}

                {/* Create Team Form (with Optional Skills, Achievements, Open Roles) */}
                {showCreate && !myTeam && (
                  <form onSubmit={handleCreate} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }} style={{ marginBottom: 20, padding: '20px 24px', borderRadius: 14, background: 'rgba(34,211,238,0.03)', border: '1px solid rgba(62,88,104,0.25)', animation: 'cardIn 0.25s ease' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--color-slate-blue)', fontWeight: 700, marginBottom: 14 }}>
                      CREATE NEW TEAM — {selectedEvent.title.toUpperCase()}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
                          TEAM NAME *
                        </label>
                        <input className="focus-cyan" type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Enter team name…" maxLength={40} autoFocus style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 8, backgroundColor: 'var(--color-white)', border: '1px solid var(--color-cream)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
                            CAPTAIN/TEAM SKILLS (OPTIONAL)
                          </label>
                          <input className="focus-cyan" type="text" value={newTeamSkills} onChange={e => setNewTeamSkills(e.target.value)} placeholder="e.g. React, Python, Figma..." style={{ width: '100%', padding: '9px 12px', fontSize: 12, borderRadius: 8, backgroundColor: 'var(--color-white)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
                            ACHIEVEMENTS (OPTIONAL)
                          </label>
                          <input className="focus-cyan" type="text" value={newTeamAchievements} onChange={e => setNewTeamAchievements(e.target.value)} placeholder="e.g. 1st Place Hackathon 2025..." style={{ width: '100%', padding: '9px 12px', fontSize: 12, borderRadius: 8, backgroundColor: 'var(--color-white)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
                          OPEN ROLES IN TEAM (OPTIONAL, COMMA-SEPARATED)
                        </label>
                        <input className="focus-cyan" type="text" value={newTeamOpenRoles} onChange={e => setNewTeamOpenRoles(e.target.value)} placeholder="e.g. Frontend Developer, UI Designer, Backend Dev" style={{ width: '100%', padding: '9px 12px', fontSize: 12, borderRadius: 8, backgroundColor: 'var(--color-white)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
                      </div>

                      {createError && <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0, fontFamily: 'var(--font-body)' }}>{createError}</p>}

                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                        <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '9px 18px', fontSize: 12, borderRadius: 8, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={creating} style={{ padding: '9px 24px', fontSize: 12, fontWeight: 700, borderRadius: 8, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(62,88,104,0.4)', color: 'var(--color-slate-blue)', cursor: 'pointer' }}>
                          {creating ? 'Creating…' : 'Create Team'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input className="focus-cyan" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search teams, members, or open roles…" style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, fontSize: 12, borderRadius: 7, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-cream)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[{ key: 'all', label: `All (${teams.length})` }, { key: 'recruiting', label: `Open (${openCount})` }, ...(myTeam ? [{ key: 'myteam', label: 'Mine' }] : [])].map(f => (
                      <button key={f.key} className="filter-btn" onClick={() => setFilterMode(f.key as any)} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, borderRadius: 7, cursor: 'pointer', background: filterMode === f.key ? 'rgba(34,211,238,0.12)' : 'transparent', border: filterMode === f.key ? '1px solid rgba(34,211,238,0.35)' : '1px solid transparent', color: filterMode === f.key ? '#22d3ee' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>{f.label}</button>
                    ))}
                  </div>
                </div>

                {error && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, backgroundColor: 'transparent', border: '1px solid var(--color-sand)', color: 'var(--color-text-secondary)', fontSize: 12, fontFamily: 'var(--font-body)' }}>{error}</div>}

                {/* Teams List */}
                {teamsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 240 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #22d3ee', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)' }}>Loading teams…</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.07)', padding: 40 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No teams found</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.12)', margin: 0 }}>{searchQuery ? `No results for "${searchQuery}"` : 'No teams created yet'}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {filtered.map((team, i) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        members={teamMembers[team.id] || []}
                        isMyTeam={!!(myTeam && myTeam.id === team.id && team.createdBy !== user.id)}
                        isCaptain={team.createdBy === user.id}
                        maxSize={selectedEvent.maxTeamSize ?? 4}
                        requestStatus={requestStatuses[team.id] || 'none'}
                        myRequestId={requestIds[team.id]}
                        isEnrolled={isEnrolled(selectedEvent.id)}
                        eventId={selectedEvent.id}
                        userAlreadyHasTeam={!!myTeam && myTeam.id !== team.id}
                        captainId={team.createdBy}
                        onRequestJoin={handleOpenJoinModal}
                        onCancelRequest={handleCancelRequest}
                        onLeave={handleLeave}
                        onKillTeam={handleKillTeam}
                        onTransferCaptaincy={setTransferModalTeam}
                        onOpenChat={(t, m) => setActiveChatTeam({ team: t, members: m })}
                        onInvite={team.createdBy === user.id ? () => setInviteModalTeam(team) : undefined}
                        onShareLink={team.createdBy === user.id ? () => handleShareLink(team) : undefined}
                        actionLoading={actionLoading === team.id}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Join Request Modal (Prompts for user skills and pitch) */}
      {joinModalTeam && (
        <JoinRequestModal
          team={joinModalTeam.team}
          selectedRole={joinModalTeam.role}
          onClose={() => setJoinModalTeam(null)}
          onSubmit={handleSendJoinRequestWithSkills}
          submitting={submittingJoin}
        />
      )}

      {/* Transfer Captaincy Modal */}
      {transferModalTeam && user && (
        <TransferCaptainModal
          team={transferModalTeam}
          members={teamMembers[transferModalTeam.id] || []}
          currentUserId={user.id}
          onClose={() => setTransferModalTeam(null)}
          onTransfer={handleTransferCaptaincy}
        />
      )}

      {/* Invite Members Modal (Captain only) */}
      {inviteModalTeam && user && (
        <InviteModal
          teamId={inviteModalTeam.id}
          captainId={user.id}
          teamName={inviteModalTeam.name}
          existingMemberIds={(teamMembers[inviteModalTeam.id] || []).map(m => m.userId)}
          onClose={() => setInviteModalTeam(null)}
        />
      )}

      {/* Team Chat Modal */}
      {activeChatTeam && user && (
        <TeamChatModal
          team={activeChatTeam.team}
          members={activeChatTeam.members}
          currentUserId={user.id}
          currentUserName={user.name}
          onClose={() => setActiveChatTeam(null)}
        />
      )}
    </div>
  )
}
