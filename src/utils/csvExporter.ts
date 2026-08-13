import type { Team, TeamMember, Submission, EventWinner } from '../mocks/types';
import { teamService } from '../services/teamService';
import { submissionService } from '../services/submissionService';

const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

export const exportTeamsToCSV = (
  eventTitle: string,
  teams: Team[],
  teamMembersMap: Record<string, TeamMember[]>,
  submissionsMap: Record<string, Submission>,
  declaredWinners: EventWinner[] = []
) => {
  if (teams.length === 0) {
    alert('No teams registered for this event to export.');
    return;
  }

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

  const rows: string[][] = [];

  const winnersMap = new Map<string, string>();
  declaredWinners.forEach((w) => winnersMap.set(w.teamId, w.position));

  teams.forEach((team) => {
    const members = teamMembersMap[team.id] || [];
    const submission = submissionsMap[team.id];
    const winnerStatus = winnersMap.get(team.id) || 'None';

    const subStatus = submission ? 'Submitted' : 'Pending';
    const repoUrl = submission?.repoUrl || 'N/A';
    const fileName = submission?.fileName || 'N/A';
    const description = submission?.description || 'N/A';
    const submittedAt = submission?.timestamp
      ? new Date(submission.timestamp).toLocaleString()
      : 'N/A';

    if (members.length === 0) {
      rows.push([
        escapeCSV(eventTitle),
        escapeCSV(team.name),
        escapeCSV(team.id),
        escapeCSV('Unassigned'),
        escapeCSV('No Registered Members'),
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
        const isCaptain = m.userId === team.createdBy;
        rows.push([
          escapeCSV(eventTitle),
          escapeCSV(team.name),
          escapeCSV(team.id),
          escapeCSV(isCaptain ? 'Team Captain 👑' : 'Team Member'),
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
  });

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.map((h) => escapeCSV(h)).join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const safeFileName = eventTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  link.setAttribute('download', `${safeFileName}_enrolled_teams_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const fetchAndExportEventTeamsCSV = async (eventId: string, eventTitle: string, winners: EventWinner[] = []) => {
  try {
    const [eventTeams, submissions] = await Promise.all([
      teamService.getTeamsForEvent(eventId),
      submissionService.getSubmissions(eventId),
    ]);

    const membersMap: Record<string, TeamMember[]> = {};
    await Promise.all(
      eventTeams.map(async (t) => {
        membersMap[t.id] = await teamService.getTeamMembers(t.id);
      })
    );

    const subMap: Record<string, Submission> = {};
    submissions.forEach((s) => {
      if (s.teamId) subMap[s.teamId.toLowerCase()] = s;
    });

    const resolvedSubMap: Record<string, Submission> = {};
    eventTeams.forEach((t) => {
      const keys = [t.id, t.name, t.createdBy].map((k) => (k || '').toLowerCase());
      for (const key of keys) {
        if (subMap[key]) {
          resolvedSubMap[t.id] = subMap[key];
          break;
        }
      }
    });

    exportTeamsToCSV(eventTitle, eventTeams, membersMap, resolvedSubMap, winners);
  } catch (err: any) {
    alert(`Failed to export teams data: ${err?.message || 'Unknown error'}`);
  }
};
