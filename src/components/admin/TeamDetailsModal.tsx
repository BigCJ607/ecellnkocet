import React, { useState } from 'react';
import type { Team, TeamMember, Submission, EventWinner, EventData } from '../../mocks/types';
import MemberProfileModal from './MemberProfileModal';

interface TeamDetailsModalProps {
  team: Team;
  members: TeamMember[];
  submission?: Submission;
  winner?: EventWinner;
  event?: EventData | null;
  onClose: () => void;
  onDeleteSubmission?: (submissionId: string, teamName: string) => void;
}

export default function TeamDetailsModal({
  team,
  members,
  submission,
  winner,
  event,
  onClose,
  onDeleteSubmission,
}: TeamDetailsModalProps) {
  const [selectedMemberForModal, setSelectedMemberForModal] = useState<{ member: TeamMember; isCaptain?: boolean } | null>(null);
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExportTeamCSV = () => {
    const headers = [
      'Event Title',
      'Team Name',
      'Team ID',
      'Member Role',
      'Student Name',
      'Student Email',
      'PNR / Student ID',
      'Branch / Department',
      'Class Year',
      'Division',
      'Deliverable Status',
      'Repo URL / Link',
      'File Deliverable Name',
      'Project Pitch / Description',
      'Submitted Date',
      'Winner / Award',
    ];

    const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows: string[][] = [];
    const eventTitle = event?.title || 'Event Roster';
    const winnerStatus = winner?.position || 'None';
    const subStatus = submission ? 'Submitted' : 'Pending';
    const repoUrl = submission?.repoUrl || 'N/A';
    const fileName = submission?.fileName || 'N/A';
    const description = submission?.description || 'N/A';
    const submittedAt = submission?.timestamp ? new Date(submission.timestamp).toLocaleString() : 'N/A';

    if (members.length === 0) {
      rows.push([
        escapeCSV(eventTitle),
        escapeCSV(team.name),
        escapeCSV(team.id),
        escapeCSV('Unassigned'),
        escapeCSV('No Members'),
        escapeCSV('N/A'),
        escapeCSV('N/A'),
        escapeCSV('N/A'),
        escapeCSV('N/A'),
        escapeCSV('N/A'),
        escapeCSV(subStatus),
        escapeCSV(repoUrl),
        escapeCSV(fileName),
        escapeCSV(description),
        escapeCSV(submittedAt),
        escapeCSV(winnerStatus),
      ]);
    } else {
      members.forEach((m) => {
        const isCap = m.userId === team.createdBy;
        rows.push([
          escapeCSV(eventTitle),
          escapeCSV(team.name),
          escapeCSV(team.id),
          escapeCSV(isCap ? 'Team Captain 👑' : 'Team Member'),
          escapeCSV(m.userName || 'Student'),
          escapeCSV(m.userEmail || 'N/A'),
          escapeCSV(m.userPnr || 'N/A'),
          escapeCSV(m.userBranch || 'N/A'),
          escapeCSV(m.userYear || 'N/A'),
          escapeCSV(m.userDivision || 'N/A'),
          escapeCSV(subStatus),
          escapeCSV(repoUrl),
          escapeCSV(fileName),
          escapeCSV(description),
          escapeCSV(submittedAt),
          escapeCSV(winnerStatus),
        ]);
      });
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.map(escapeCSV).join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${team.name.replace(/[^a-zA-Z0-9]/g, '_')}_details_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(5, 5, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '90vh',
          borderRadius: 24,
          overflow: 'hidden',
          background: '#0c0c18',
          border: '1px solid rgba(34, 211, 238, 0.4)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 60px rgba(34, 211, 238, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'default',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  color: '#22d3ee',
                }}
              >
                TEAM DETAILS ROSTER
              </span>
              {event && (
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  · {event.title}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 30,
                  color: '#ffffff',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                {team.name}
              </h2>

              {winner && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: 'rgba(234,179,8,0.2)',
                    border: '1px solid rgba(234,179,8,0.4)',
                    color: '#fde047',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  🏆 {winner.position} Place
                </span>
              )}

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: submission ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.05)',
                  border: submission ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  color: submission ? '#22d3ee' : '#9ca3af',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {submission ? '📦 Submitted' : '⏳ Pending Submission'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleExportTeamCSV}
              style={{
                padding: '8px 16px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
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
              📥 Export Team CSV
            </button>

            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Team Metadata Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                TEAM ID
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#818cf8', fontWeight: 600 }}>
                {team.id}
              </span>
            </div>

            <div
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                ROSTER SIZE
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: '#ffffff', fontWeight: 700 }}>
                👥 {members.length} Registered Members
              </span>
            </div>

            {team.skills && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 12,
                  background: 'rgba(34,211,238,0.03)',
                  border: '1px solid rgba(34,211,238,0.2)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#22d3ee', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  TECH STACK & SKILLS
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#ffffff', fontWeight: 600 }}>
                  {team.skills}
                </span>
              </div>
            )}
          </div>

          {/* Members Roster Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#ffffff', margin: 0 }}>
                Team Members Roster ({members.length})
              </h3>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                👑 Indicates Team Captain
              </span>
            </div>

            {members.length === 0 ? (
              <div style={{ padding: '24px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                No members found for this team.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {members.map((m) => {
                  const isCap = m.userId === team.createdBy;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMemberForModal({ member: m, isCaptain: isCap })}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 14,
                        background: isCap ? 'rgba(5, 150, 105, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: isCap ? '1px solid rgba(5, 150, 105, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                      }}
                      title="Click to view full student profile details"
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          background: isCap ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {(m.userName?.charAt(0) || 'U').toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <h4 style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700, color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.userName || 'Student Participant'}
                          </h4>
                          {isCap && (
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(5, 150, 105, 0.25)', color: '#6ee7b7', fontFamily: 'var(--font-ui)' }}>
                              👑 CAPTAIN
                            </span>
                          )}
                        </div>

                        {m.userEmail && (
                          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 6px', wordBreak: 'break-all' }}>
                            {m.userEmail}
                          </p>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {m.userPnr && (
                            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)' }}>
                              PRN: {m.userPnr}
                            </span>
                          )}
                          {m.userBranch && (
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#d1d5db' }}>
                              {m.userBranch}
                            </span>
                          )}
                          {m.userYear && (
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                              {m.userYear} {m.userDivision ? `· Div ${m.userDivision}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Deliverable / Submission Details */}
          <div
            style={{
              padding: '20px 24px',
              borderRadius: 16,
              background: submission ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.015)',
              border: submission ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.14em', color: submission ? '#22d3ee' : 'rgba(255,255,255,0.3)', fontWeight: 800 }}>
                {submission ? '📦 PROJECT SUBMISSION DELIVERABLE' : '⏳ SUBMISSION STATUS'}
              </span>

              {submission && onDeleteSubmission && (
                <button
                  onClick={() => onDeleteSubmission(submission.id, team.name)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  🗑 DELETE SUBMISSION
                </button>
              )}
            </div>

            {submission ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {submission.repoUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)' }}>URL / Repository:</span>
                    <a
                      href={submission.repoUrl.startsWith('http') ? submission.repoUrl : `https://${submission.repoUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: '#22d3ee',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        textDecoration: 'underline',
                      }}
                    >
                      🔗 {submission.repoUrl}
                    </a>
                  </div>
                )}

                {submission.fileName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)' }}>Deliverable File:</span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#ffffff', fontWeight: 600 }}>
                      📦 {submission.fileName} {submission.fileSize ? `(${formatBytes(submission.fileSize)})` : ''}
                    </span>
                  </div>
                )}

                {submission.description && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 2 }}>Project Description / Pitch:</span>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6, background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <em>"{submission.description}"</em>
                    </p>
                  </div>
                )}

                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  Submitted: {new Date(submission.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                No project deliverables submitted by this team yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {selectedMemberForModal && (
        <MemberProfileModal
          member={selectedMemberForModal.member}
          teamName={team.name}
          isCaptain={selectedMemberForModal.isCaptain}
          onClose={() => setSelectedMemberForModal(null)}
        />
      )}
    </div>
  );
}
