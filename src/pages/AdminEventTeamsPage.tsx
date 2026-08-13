import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { eventService } from '../services/eventService';
import { teamService } from '../services/teamService';
import { submissionService } from '../services/submissionService';
import { isOriginalAdminEmail } from '../services/authService';
import { exportTeamsToCSV } from '../utils/csvExporter';
import TeamDetailsModal from '../components/admin/TeamDetailsModal';
import MemberProfileModal from '../components/admin/MemberProfileModal';
import type { EventData, Team, TeamMember, EventWinner, Submission } from '../mocks/types';

export default function AdminEventTeamsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useApp();

  const [event, setEvent] = useState<EventData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TeamMember[]>>({});
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission>>({});
  const [declaredWinners, setDeclaredWinners] = useState<EventWinner[]>([]);
  const [selectedTeamForModal, setSelectedTeamForModal] = useState<Team | null>(null);
  const [selectedMemberForModal, setSelectedMemberForModal] = useState<{ member: TeamMember; teamName?: string; isCaptain?: boolean } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [savingWinner, setSavingWinner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'submitted' | 'winners'>('all');

  const isAdmin = user?.role === 'admin' || isOriginalAdminEmail(user?.email);

  const loadPageData = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [allEvents, eventTeams, submissions] = await Promise.all([
        eventService.getAllEvents(),
        teamService.getTeamsForEvent(eventId),
        submissionService.getSubmissions(eventId),
      ]);

      const foundEvent = allEvents.find((e) => e.id === eventId);
      setEvent(foundEvent || null);
      setDeclaredWinners(foundEvent?.winners || []);
      setTeams(eventTeams);

      // Fetch team members for each team
      const membersMap: Record<string, TeamMember[]> = {};
      await Promise.all(
        eventTeams.map(async (t) => {
          membersMap[t.id] = await teamService.getTeamMembers(t.id);
        })
      );
      setTeamMembersMap(membersMap);

      // Build submission lookup — match by team UUID, team name, or creator user ID
      // (teamId in localStorage can be stored as UUID, name, or userId depending on when it was submitted)
      const subMap: Record<string, Submission> = {};
      submissions.forEach((s) => {
        if (s.teamId) subMap[s.teamId.toLowerCase()] = s;
      });
      // Resolve each team against the submission map using all possible keys
      const resolvedSubMap: Record<string, Submission> = {};
      eventTeams.forEach((t) => {
        const keys = [t.id, t.name, t.createdBy].map(k => (k || '').toLowerCase());
        for (const key of keys) {
          if (subMap[key]) {
            resolvedSubMap[t.id] = subMap[key];
            break;
          }
        }
      });
      setSubmissionsMap(resolvedSubMap);
    } catch (err) {
      console.error('Failed to load admin event teams data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, [eventId]);

  const handleDeclareWinner = async (team: Team, position: '1st' | '2nd' | '3rd' | 'Winner') => {
    if (!event) return;
    setSavingWinner(team.id);
    try {
      const members = teamMembersMap[team.id] || [];
      const memberNames = members
        .map((m) => m.userName)
        .filter((name): name is string => Boolean(name));

      const winnerObj: EventWinner = {
        teamId: team.id,
        teamName: team.name,
        position,
        members: memberNames.length > 0 ? memberNames : ['Team Members'],
        declaredAt: new Date().toISOString(),
      };

      await eventService.declareEventWinner(event.id, winnerObj);

      // Update state
      setDeclaredWinners((prev) => {
        const filtered = prev.filter((w) => w.teamId !== team.id && w.position !== position);
        return [...filtered, winnerObj];
      });
    } catch (err) {
      console.error('Failed to declare winner:', err);
    } finally {
      setSavingWinner(null);
    }
  };

  const handleRemoveWinner = async (teamId: string) => {
    if (!event) return;
    try {
      await eventService.removeEventWinner(event.id, teamId);
      setDeclaredWinners((prev) => prev.filter((w) => w.teamId !== teamId));
    } catch (err) {
      console.error('Failed to remove winner:', err);
    }
  };

  const handleDeleteSubmission = async (submissionId: string, teamName: string) => {
    if (!eventId) return;
    if (!window.confirm(`Are you sure you want to delete the submission for "${teamName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await submissionService.deleteSubmission(submissionId, eventId);
      await loadPageData();
    } catch (err: any) {
      alert(`Failed to delete submission: ${err?.message || 'Unknown error'}`);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: 24, paddingTop: 'calc(var(--nav-h) + 2rem)' }}>
        <div style={{ padding: 40, borderRadius: 20, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center', maxWidth: 480 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#f87171', margin: '0 0 12px' }}>403 · RESTRICTED ACCESS</h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Only platform administrators (nikhildeosani@gmail.com) can access team submissions and winner declaration console.</p>
          <Link to="/admin" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 8, background: '#6366f1', color: '#fff', fontWeight: 700, fontFamily: 'var(--font-ui)', fontSize: 12 }}>Return to Admin Console</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff' }}>EVENT NOT FOUND</h1>
        <Link to="/admin" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 8, background: '#6366f1', color: '#fff', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>Back to Admin</Link>
      </div>
    );
  }

  // Set of positions already awarded to other teams
  const takenPositions = new Set(declaredWinners.map((w) => w.position));

  // Filter teams list
  const filteredTeams = teams.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (teamMembersMap[t.id] || []).some((m) => (m.userName || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const isWinner = declaredWinners.some((w) => w.teamId === t.id);
    const hasSubmission = Boolean(submissionsMap[t.id]);

    if (filterMode === 'submitted' && !hasSubmission) return false;
    if (filterMode === 'winners' && !isWinner) return false;

    return matchesSearch;
  });

  const totalSubmittedCount = Object.keys(submissionsMap).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: 'var(--nav-h)' }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .win-btn:disabled { opacity: 0.3; cursor: not-allowed!important; }
        .win-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.15); }
      `}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 80px', animation: 'fadeIn 0.3s ease' }}>
        {/* Top Breadcrumb & Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <Link
            to="/admin"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: '#818cf8',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← BACK TO ADMIN CONSOLE
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => exportTeamsToCSV(event.title, teams, teamMembersMap, submissionsMap, declaredWinners)}
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                padding: '6px 14px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#6ee7b7',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              📥 EXPORT TEAMS CSV ({teams.length})
            </button>

            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.12em',
                padding: '6px 12px',
                borderRadius: 6,
                background: 'rgba(34,211,238,0.1)',
                border: '1px solid rgba(34,211,238,0.3)',
                color: '#22d3ee',
                fontFamily: 'var(--font-ui)',
              }}
            >
              ADMIN TEAMS &amp; SUBMISSIONS MANAGEMENT
            </span>
          </div>
        </div>

        {/* Header Title Section */}
        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', padding: '3px 9px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontFamily: 'var(--font-ui)' }}>
              {event.category.toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              📅 {event.date}
            </span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: '#fff', margin: 0, lineHeight: 1.1 }}>
            {event.title}
          </h1>

          {/* KPI Pills */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', fontWeight: 700, display: 'block' }}>TEAMS REGISTERED</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fff' }}>{teams.length}</span>
            </div>

            <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.14em', color: '#22d3ee', fontWeight: 700, display: 'block' }}>PROJECT SUBMISSIONS</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#22d3ee' }}>{totalSubmittedCount}</span>
            </div>

            <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.14em', color: '#fde047', fontWeight: 700, display: 'block' }}>WINNERS DECLARED</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fde047' }}>{declaredWinners.length}</span>
            </div>
          </div>
        </div>

        {/* 🏆 DECLARED WINNERS CARD */}
        {declaredWinners.length > 0 && (
          <div
            style={{
              marginBottom: 32,
              padding: '24px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(245, 158, 11, 0.05) 100%)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              boxShadow: '0 0 40px rgba(234, 179, 8, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#fde047' }}>
                  OFFICIAL EVENT CHAMPIONS
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: '#ffffff', margin: 0 }}>
                  Declared Winners Roster
                </h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {declaredWinners.map((w) => (
                <div
                  key={w.teamId + w.position}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 14,
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(234,179,8,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: w.position === '1st' || w.position === 'Winner' ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.1)',
                          color: w.position === '1st' || w.position === 'Winner' ? '#fde047' : '#e2e8f0',
                          border: '1px solid rgba(234,179,8,0.4)',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        {w.position === '1st' ? '🥇 1st Place Champion' : w.position === '2nd' ? '🥈 2nd Place Runner Up' : w.position === '3rd' ? '🥉 3rd Place' : '🏆 Winner'}
                      </span>
                      <button
                        onClick={() => handleRemoveWinner(w.teamId)}
                        style={{
                          padding: '3px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 5,
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#ffffff', margin: '4px 0 2px' }}>
                      {w.teamName}
                    </h3>
                    {w.members && w.members.length > 0 && (
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
                        Teammates: <strong style={{ color: '#e2e8f0' }}>{w.members.join(', ')}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search teams or member names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              borderRadius: 10,
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              fontFamily: 'var(--font-ui)',
              outline: 'none',
              minWidth: 260,
            }}
          />

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all', label: `All Teams (${teams.length})` },
              { key: 'submitted', label: `Submitted Only (${totalSubmittedCount})` },
              { key: 'winners', label: `Winners (${declaredWinners.length})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterMode(f.key as any)}
                style={{
                  padding: '7px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  background: filterMode === f.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  border: filterMode === f.key ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: filterMode === f.key ? '#fff' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* TEAMS & SUBMISSIONS CARDS LIST */}
        {filteredTeams.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)' }}>
            No teams found matching your filter criteria.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filteredTeams.map((t) => {
              const members = teamMembersMap[t.id] || [];
              const submission = submissionsMap[t.id];
              const isWinner = declaredWinners.some((w) => w.teamId === t.id);
              const currentWinner = declaredWinners.find((w) => w.teamId === t.id);

              return (
                <div
                  key={t.id}
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: isWinner ? 'rgba(234, 179, 8, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    border: isWinner ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isWinner ? '0 0 30px rgba(234, 179, 8, 0.08)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{ height: 3, background: isWinner ? 'linear-gradient(90deg, #fde047, #f59e0b)' : 'linear-gradient(90deg, #6366f1, #22d3ee)' }} />

                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Header: Team Name & Winner Action Controls */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                          <h2
                            onClick={() => setSelectedTeamForModal(t)}
                            className="hover:text-cyan-300 transition-colors cursor-pointer"
                            style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: '#ffffff', margin: 0 }}
                            title="Click to view full team & member details"
                          >
                            {t.name}
                          </h2>
                          <button
                            onClick={() => setSelectedTeamForModal(t)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'rgba(34,211,238,0.12)',
                              border: '1px solid rgba(34,211,238,0.3)',
                              color: '#22d3ee',
                              fontFamily: 'var(--font-ui)',
                              cursor: 'pointer',
                            }}
                          >
                            🔍 VIEW DETAILS ↗
                          </button>
                          {isWinner && (
                            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)', color: '#fde047', fontFamily: 'var(--font-ui)' }}>
                              🏆 {currentWinner?.position === '1st' ? '1st Place Champion' : currentWinner?.position === '2nd' ? '2nd Place Runner Up' : currentWinner?.position === '3rd' ? '3rd Place' : 'Winner'}
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>
                            👥 {members.length} Members
                          </span>
                        </div>

                        {t.skills && (
                          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#22d3ee', margin: '2px 0 0' }}>
                            Skills: {t.skills}
                          </p>
                        )}
                      </div>

                      {/* 🏆 WINNER DECLARATION BUTTONS (Position Disappears Logic) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {isWinner ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fde047', fontFamily: 'var(--font-ui)' }}>
                              Awarded: {currentWinner?.position} Place
                            </span>
                            <button
                              onClick={() => handleRemoveWinner(t.id)}
                              style={{
                                padding: '6px 14px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 8,
                                cursor: 'pointer',
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.35)',
                                color: '#f87171',
                                fontFamily: 'var(--font-ui)',
                              }}
                            >
                              Remove Winner Status
                            </button>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginRight: 4 }}>
                              DECLARE:
                            </span>

                            {/* 1st Place Button — ONLY DISPLAYS IF 1st PLACE IS NOT YET TAKEN BY ANOTHER TEAM */}
                            {!takenPositions.has('1st') && (
                              <button
                                className="win-btn"
                                disabled={savingWinner === t.id}
                                onClick={() => handleDeclareWinner(t, '1st')}
                                style={{
                                  padding: '7px 14px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  background: 'rgba(234, 179, 8, 0.15)',
                                  border: '1px solid rgba(234, 179, 8, 0.45)',
                                  color: '#fde047',
                                  fontFamily: 'var(--font-ui)',
                                  transition: 'all 0.15s',
                                }}
                              >
                                🥇 1st Place (Winner)
                              </button>
                            )}

                            {/* 2nd Place Button — ONLY DISPLAYS IF 2nd PLACE IS NOT YET TAKEN */}
                            {!takenPositions.has('2nd') && (
                              <button
                                className="win-btn"
                                disabled={savingWinner === t.id}
                                onClick={() => handleDeclareWinner(t, '2nd')}
                                style={{
                                  padding: '7px 14px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  background: 'rgba(148, 163, 184, 0.15)',
                                  border: '1px solid rgba(148, 163, 184, 0.4)',
                                  color: '#cbd5e1',
                                  fontFamily: 'var(--font-ui)',
                                  transition: 'all 0.15s',
                                }}
                              >
                                🥈 2nd Place
                              </button>
                            )}

                            {/* 3rd Place Button — ONLY DISPLAYS IF 3rd PLACE IS NOT YET TAKEN */}
                            {!takenPositions.has('3rd') && (
                              <button
                                className="win-btn"
                                disabled={savingWinner === t.id}
                                onClick={() => handleDeclareWinner(t, '3rd')}
                                style={{
                                  padding: '7px 14px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  background: 'rgba(217, 119, 6, 0.15)',
                                  border: '1px solid rgba(217, 119, 6, 0.4)',
                                  color: '#f97316',
                                  fontFamily: 'var(--font-ui)',
                                  transition: 'all 0.15s',
                                }}
                              >
                                🥉 3rd Place
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Members List */}
                    <div>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', fontWeight: 700, margin: '0 0 8px' }}>
                        TEAM MEMBERS (click to view profile)
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                        {members.map((m) => {
                          const isCap = m.userId === t.createdBy;
                          return (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMemberForModal({ member: m, teamName: t.name, isCaptain: isCap })}
                              className="hover:border-cyan-500/50 hover:bg-white/[0.04] transition-all cursor-pointer"
                              style={{
                                padding: '9px 12px',
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                              }}
                              title="Click to view full student profile details"
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  background: isCap ? '#059669' : '#4f46e5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: '#fff',
                                }}
                              >
                                {(m.userName?.charAt(0) || 'U').toUpperCase()}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.userName} {isCap && '👑'}
                                </p>
                                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                                  {m.userBranch || 'Student'}{m.userDivision ? ` · Div ${m.userDivision}` : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PROJECT SUBMISSION DETAILS */}
                    <div
                      style={{
                        padding: '16px 18px',
                        borderRadius: 12,
                        background: submission ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.015)',
                        border: submission ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.14em', color: submission ? '#22d3ee' : 'rgba(255,255,255,0.3)', fontWeight: 800 }}>
                          {submission ? '📦 PROJECT SUBMISSION DELIVERABLE' : '⏳ SUBMISSION STATUS'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {submission?.timestamp && (
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                              Submitted {new Date(submission.timestamp).toLocaleDateString()}
                            </span>
                          )}
                          {submission && isAdmin && (
                            <button
                              onClick={() => handleDeleteSubmission(submission.id, t.name)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#f87171',
                                fontFamily: 'var(--font-ui)',
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                              title="Delete project submission"
                            >
                              🗑 DELETE SUBMISSION
                            </button>
                          )}
                        </div>
                      </div>

                      {submission ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {submission.repoUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)' }}>URL / Repository:</span>
                              <a
                                href={submission.repoUrl.startsWith('http') ? submission.repoUrl : `https://${submission.repoUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: '#22d3ee',
                                  fontSize: 12,
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                🔗 {submission.repoUrl}
                              </a>
                            </div>
                          )}

                          {submission.fileName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)' }}>Deliverable File:</span>
                              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                                📦 {submission.fileName} {submission.fileSize ? `(${(submission.fileSize / (1024 * 1024)).toFixed(2)} MB)` : ''}
                              </span>
                            </div>
                          )}

                          {submission.description && (
                            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', lineHeight: 1.5 }}>
                              Description / Pitch: <em>"{submission.description}"</em>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                          No deliverables or project links submitted by this team yet.
                        </p>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Team Details Inspect Modal */}
      {selectedTeamForModal && (
        <TeamDetailsModal
          team={selectedTeamForModal}
          members={teamMembersMap[selectedTeamForModal.id] || []}
          submission={submissionsMap[selectedTeamForModal.id]}
          winner={declaredWinners.find(w => w.teamId === selectedTeamForModal.id)}
          event={event}
          onClose={() => setSelectedTeamForModal(null)}
        />
      )}
      {/* Member Profile Modal */}
      {selectedMemberForModal && (
        <MemberProfileModal
          member={selectedMemberForModal.member}
          teamName={selectedMemberForModal.teamName}
          isCaptain={selectedMemberForModal.isCaptain}
          onClose={() => setSelectedMemberForModal(null)}
        />
      )}
    </div>
  );
}
