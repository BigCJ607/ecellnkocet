import type { Team, TeamMember } from '../mocks/types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const mapDbTeam = (row: any, members: any[]): Team => ({
  id: row.id,
  name: row.name,
  eventId: row.event_id,
  createdBy: row.created_by,
  memberIds: members.map(m => m.user_id),
  memberCount: members.length,
  createdAt: row.created_at,
  skills: row.skills || '',
  achievements: row.achievements || '',
  openRoles: Array.isArray(row.open_roles) ? row.open_roles : (typeof row.open_roles === 'string' ? row.open_roles.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
});

const mapDbMember = (row: any, profile: any): TeamMember => ({
  id: row.id,
  teamId: row.team_id,
  userId: row.user_id,
  userName: profile?.name || 'Unknown',
  userEmail: profile?.contact_email || '',
  userPnr: profile?.pnr || '',
  userBranch: profile?.branch || '',
  userDivision: profile?.division || '',
  userYear: profile?.class_year || '',
  joinedAt: row.joined_at,
});

export const teamService = {
  /** Fetch all teams for a given event with member counts */
  async getTeamsForEvent(eventId: string): Promise<Team[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error || !teams || teams.length === 0) return [];

    const teamIds = teams.map(t => t.id);
    const { data: members } = await supabase
      .from('team_members')
      .select('*')
      .in('team_id', teamIds);

    const allMembers: any[] = members || [];

    return teams.map(t => {
      const teamMembers = allMembers.filter(m => m.team_id === t.id);
      return mapDbTeam(t, teamMembers);
    });
  },

  /** Get all teams a user belongs to */
  async getUserTeams(userId: string): Promise<Team[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);

    if (!memberships || memberships.length === 0) return [];

    const teamIds = memberships.map(m => m.team_id);
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds);

    if (!teams) return [];

    const { data: allMembers } = await supabase
      .from('team_members')
      .select('*')
      .in('team_id', teamIds);

    const membersList: any[] = allMembers || [];

    return teams.map(t => {
      const teamMembers = membersList.filter(m => m.team_id === t.id);
      return mapDbTeam(t, teamMembers);
    });
  },

  /** Get members of a specific team with profile details */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error || !members || members.length === 0) return [];

    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, pnr, branch, division, class_year')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    return members.map(m => mapDbMember(m, profileMap[m.user_id]));
  },

  /** Get the team the user is in for a specific event (if any) */
  async getUserTeamForEvent(eventId: string, userId: string): Promise<Team | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', eventId);

    if (!teams || teams.length === 0) return null;

    const teamIds = teams.map(t => t.id);

    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .in('team_id', teamIds)
      .maybeSingle();

    if (!membership) return null;

    const myTeam = teams.find(t => t.id === membership.team_id);
    if (!myTeam) return null;

    const { data: members } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', myTeam.id);

    return mapDbTeam(myTeam, members || []);
  },

  /** Create a new team and add the creator as first member */
  async createTeam(
    eventId: string,
    teamName: string,
    userId: string,
    details?: { skills?: string; achievements?: string; openRoles?: string[] }
  ): Promise<Team> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const existing = await this.getUserTeamForEvent(eventId, userId);
    if (existing) throw new Error('You are already in a team for this event. Leave your current team first.');

    const teamId = `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const insertPayload: any = {
      id: teamId,
      name: teamName.trim(),
      event_id: eventId,
      created_by: userId,
    };
    if (details?.skills?.trim()) insertPayload.skills = details.skills.trim();
    if (details?.achievements?.trim()) insertPayload.achievements = details.achievements.trim();
    if (details?.openRoles && details.openRoles.length > 0) insertPayload.open_roles = details.openRoles;

    let team: any = null;
    let teamError: any = null;

    const res1 = await supabase
      .from('teams')
      .insert(insertPayload)
      .select()
      .single();

    if (res1.error && (res1.error.message.includes('Could not find the') || res1.error.code === 'PGRST204')) {
      // Fallback: If DB schema doesn't have optional columns, insert core fields
      const res2 = await supabase
        .from('teams')
        .insert({
          id: teamId,
          name: teamName.trim(),
          event_id: eventId,
          created_by: userId,
        })
        .select()
        .single();
      team = res2.data;
      teamError = res2.error;
    } else {
      team = res1.data;
      teamError = res1.error;
    }

    if (teamError || !team) throw new Error(teamError?.message || 'Failed to create team.');

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
      });

    if (memberError) throw new Error(memberError.message);

    const created = mapDbTeam(team, [{ user_id: userId }]);
    if (details?.skills) created.skills = details.skills;
    if (details?.achievements) created.achievements = details.achievements;
    if (details?.openRoles) created.openRoles = details.openRoles;
    return created;
  },

  /** Transfer captainship to another team member */
  async transferCaptaincy(teamId: string, currentCaptainId: string, newCaptainId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { data: team, error: fetchErr } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    if (fetchErr || !team) throw new Error('Team not found.');
    if (team.created_by !== currentCaptainId) throw new Error('Only the current team captain can transfer captaincy.');

    const { error } = await supabase
      .from('teams')
      .update({ created_by: newCaptainId })
      .eq('id', teamId);

    if (error) throw new Error(error.message);
  },

  /** Update open roles for a team */
  async updateOpenRoles(teamId: string, captainUserId: string, openRoles: string[]): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { data: team } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    if (team?.created_by !== captainUserId) throw new Error('Only the team captain can manage open roles.');

    const { error } = await supabase
      .from('teams')
      .update({ open_roles: openRoles })
      .eq('id', teamId);

    if (error && (error.message.includes('Could not find the') || error.code === 'PGRST204')) {
      return;
    }

    if (error) throw new Error(error.message);
  },

  /** Join a team (enforces max size) */
  async joinTeam(teamId: string, userId: string, eventId: string, maxSize: number): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const existing = await this.getUserTeamForEvent(eventId, userId);
    if (existing) throw new Error('You are already in a team for this event.');

    const { count, error: countError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= maxSize) throw new Error(`This team is full (max ${maxSize} members).`);

    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
      });

    if (error) throw new Error(error.message);
  },

  /** Leave a team */
  async leaveTeam(teamId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // Check if captain trying to leave
    const { data: team } = await supabase.from('teams').select('created_by').eq('id', teamId).single();
    if (team?.created_by === userId) {
      throw new Error('As team captain, you cannot leave the team directly. Please kill the team or transfer captaincy to a teammate.');
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .match({ team_id: teamId, user_id: userId });

    if (error) throw new Error(error.message);
  },

  /** Delete / Kill a team entirely (only the creator/captain) */
  async deleteTeam(teamId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { data: team, error: fetchErr } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    if (fetchErr || !team) throw new Error('Team not found.');
    if (team.created_by !== userId) throw new Error('Only the team captain can kill this team.');

    await supabase.from('team_join_requests').delete().eq('team_id', teamId);
    await supabase.from('team_members').delete().eq('team_id', teamId);

    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) throw new Error(error.message);
  },

  // ── JOIN REQUEST SYSTEM ───────────────────────────────────────────────────

  /** Send a join request to a team with user skills and pitch */
  async sendJoinRequest(
    teamId: string,
    userId: string,
    eventId: string,
    details?: { userSkills?: string; userPitch?: string; requestedRole?: string }
  ): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    // Must not already be in a team for this event
    const existing = await this.getUserTeamForEvent(eventId, userId);
    if (existing) throw new Error('You are already in a team for this event.');

    // Check for any existing request (any status)
    const { data: existingReq } = await supabase
      .from('team_join_requests')
      .select('id, status')
      .match({ team_id: teamId, user_id: userId })
      .maybeSingle();

    if (existingReq?.status === 'pending') throw new Error('You already have a pending request for this team.');

    const payload: any = { status: 'pending' };
    if (details?.userSkills?.trim()) payload.user_skills = details.userSkills.trim();
    if (details?.userPitch?.trim()) payload.user_pitch = details.userPitch.trim();
    if (details?.requestedRole?.trim()) payload.requested_role = details.requestedRole.trim();

    if (existingReq) {
      // Update the existing row (avoids unique constraint violation)
      let res = await supabase.from('team_join_requests').update(payload).eq('id', existingReq.id);
      if (res.error && (res.error.message.includes('Could not find the') || res.error.code === 'PGRST204')) {
        res = await supabase.from('team_join_requests').update({ status: 'pending' }).eq('id', existingReq.id);
      }
      if (res.error) throw new Error(res.error.message);
      return;
    }

    // No existing row — safe to insert
    const insertPayload = { team_id: teamId, user_id: userId, ...payload };
    let { error } = await supabase.from('team_join_requests').insert(insertPayload);
    if (error && (error.message.includes('Could not find the') || error.code === 'PGRST204')) {
      const res = await supabase.from('team_join_requests').insert({ team_id: teamId, user_id: userId, status: 'pending' });
      error = res.error;
    }
    if (error) throw new Error(error.message);
  },

  /** Get all pending requests for a team (for the captain) */
  async getRequestsForTeam(teamId: string): Promise<Array<{
    id: string; teamId: string; userId: string; status: string; createdAt: string;
    userName?: string; userPnr?: string; userBranch?: string; userYear?: string; userDivision?: string;
    userSkills?: string; userPitch?: string; requestedRole?: string;
  }>> {
    if (!isSupabaseConfigured()) return [];

    const { data: requests, error } = await supabase
      .from('team_join_requests')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error || !requests || requests.length === 0) return [];

    const userIds = requests.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, pnr, branch, class_year, division')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    return requests.map(r => {
      const p = profileMap[r.user_id] || {};
      return {
        id: r.id,
        teamId: r.team_id,
        userId: r.user_id,
        status: r.status,
        createdAt: r.created_at,
        userName: p.name || 'Unknown',
        userPnr: p.pnr || '',
        userBranch: p.branch || '',
        userYear: p.class_year || '',
        userDivision: p.division || '',
        userSkills: r.user_skills || '',
        userPitch: r.user_pitch || '',
        requestedRole: r.requested_role || '',
      };
    });
  },

  /** Get all pending requests across ALL teams created by a user */
  async getAllCreatorRequests(creatorUserId: string): Promise<Array<{
    id: string; teamId: string; teamName: string; userId: string; status: string; createdAt: string;
    userName?: string; userPnr?: string; userBranch?: string; userYear?: string;
  }>> {
    if (!isSupabaseConfigured()) return [];

    const { data: myTeams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('created_by', creatorUserId);

    if (!myTeams || myTeams.length === 0) return [];

    const teamIds = myTeams.map(t => t.id);
    const teamNameMap: Record<string, string> = {};
    myTeams.forEach(t => { teamNameMap[t.id] = t.name; });

    const { data: requests } = await supabase
      .from('team_join_requests')
      .select('*')
      .in('team_id', teamIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!requests || requests.length === 0) return [];

    const userIds = requests.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, pnr, branch, class_year, division')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    return requests.map(r => {
      const p = profileMap[r.user_id] || {};
      return {
        id: r.id,
        teamId: r.team_id,
        teamName: teamNameMap[r.team_id] || '',
        userId: r.user_id,
        status: r.status,
        createdAt: r.created_at,
        userName: p.name || 'Unknown',
        userPnr: p.pnr || '',
        userBranch: p.branch || '',
        userYear: p.class_year || '',
      };
    });
  },

  /** Get the current user's request status for a specific team */
  async getMyRequestStatus(teamId: string, userId: string): Promise<'none' | 'pending' | 'accepted' | 'rejected'> {
    if (!isSupabaseConfigured()) return 'none';

    const { data } = await supabase
      .from('team_join_requests')
      .select('status')
      .match({ team_id: teamId, user_id: userId })
      .maybeSingle();

    return (data?.status as any) || 'none';
  },

  /** Get request statuses for user across multiple teams */
  async getMyRequestStatuses(teamIds: string[], userId: string): Promise<Record<string, 'none' | 'pending' | 'accepted' | 'rejected'>> {
    if (!isSupabaseConfigured() || teamIds.length === 0) return {};

    const { data } = await supabase
      .from('team_join_requests')
      .select('team_id, status')
      .eq('user_id', userId)
      .in('team_id', teamIds);

    const map: Record<string, any> = {};
    (data || []).forEach(r => { map[r.team_id] = r.status; });
    return map;
  },

  /** Accept a join request — add to team, mark accepted */
  async acceptRequest(requestId: string, teamId: string, applicantUserId: string, maxSize: number): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    // Check team is not full
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if ((count ?? 0) >= maxSize) throw new Error(`Team is full (max ${maxSize} members).`);

    // Add to team members
    const { error: memberErr } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: applicantUserId });

    if (memberErr) throw new Error(memberErr.message);

    // Mark request accepted
    await supabase
      .from('team_join_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
  },

  /** Reject a join request */
  async rejectRequest(requestId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('team_join_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw new Error(error.message);
  },

  /** Cancel own pending request */
  async cancelRequest(requestId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('team_join_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw new Error(error.message);
  },

  // ── INVITATION SYSTEM (Captain → User) ───────────────────────────────────

  /**
   * Captain sends a direct invitation to a user.
   * Re-inviting after a rejection resets status back to pending.
   */
  async sendInvitation(teamId: string, inviterId: string, inviteeId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    // Check existing invitation row
    const { data: existing } = await supabase
      .from('team_invitations')
      .select('id, status')
      .match({ team_id: teamId, invitee_id: inviteeId })
      .maybeSingle();

    if (existing?.status === 'pending') throw new Error('An invitation is already pending for this user.');
    if (existing?.status === 'accepted') throw new Error('This user has already accepted an invitation for this team.');

    if (existing) {
      // Re-invite after rejection — reset to pending
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'pending', inviter_id: inviterId, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await supabase
      .from('team_invitations')
      .insert({ team_id: teamId, inviter_id: inviterId, invitee_id: inviteeId, status: 'pending' });

    if (error) throw new Error(error.message);
  },

  /** Fetch all pending invitations for the current user (invitee perspective) */
  async getMyInvitations(userId: string): Promise<import('../mocks/types').TeamInvitation[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data: invites, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !invites || invites.length === 0) return [];

    const teamIds = [...new Set(invites.map((i: any) => i.team_id))];
    const inviterIds = [...new Set(invites.map((i: any) => i.inviter_id))];

    const [teamsRes, profilesRes] = await Promise.all([
      supabase.from('teams').select('id, name, event_id').in('id', teamIds),
      supabase.from('profiles').select('id, name').in('id', inviterIds),
    ]);

    const teamMap: Record<string, any> = {};
    (teamsRes.data || []).forEach((t: any) => { teamMap[t.id] = t; });

    const eventIds = [...new Set(Object.values(teamMap).map((t: any) => t.event_id))];
    const eventsRes = await supabase.from('events').select('id, title').in('id', eventIds);
    const eventMap: Record<string, string> = {};
    (eventsRes.data || []).forEach((e: any) => { eventMap[e.id] = e.title; });

    const profileMap: Record<string, string> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p.name; });

    return invites.map((inv: any) => {
      const team = teamMap[inv.team_id] || {};
      return {
        id: inv.id,
        teamId: inv.team_id,
        teamName: team.name || 'Unknown Team',
        eventId: team.event_id || '',
        eventTitle: eventMap[team.event_id] || 'Unknown Event',
        inviterId: inv.inviter_id,
        inviterName: profileMap[inv.inviter_id] || 'Unknown',
        inviteeId: inv.invitee_id,
        status: inv.status,
        createdAt: inv.created_at,
      };
    });
  },

  /** Accept an invitation — joins the team and marks accepted */
  async acceptInvitation(
    invitationId: string,
    teamId: string,
    inviteeId: string,
    eventId: string,
    maxSize: number
  ): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    // Must not already be in a team for this event
    const existing = await this.getUserTeamForEvent(eventId, inviteeId);
    if (existing) throw new Error('You are already in a team for this event.');

    // Check capacity
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);
    if ((count ?? 0) >= maxSize) throw new Error(`Team is full (max ${maxSize} members).`);

    // Add to team
    const { error: memberErr } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: inviteeId });
    if (memberErr) throw new Error(memberErr.message);

    // Mark invitation accepted
    await supabase
      .from('team_invitations')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', invitationId);
  },

  /** Reject an invitation (captain can re-invite after this) */
  async rejectInvitation(invitationId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', invitationId);

    if (error) throw new Error(error.message);
  },

  /** Get invite status for a specific (team, invitee) pair */
  async getTeamInviteStatus(teamId: string, inviteeId: string): Promise<'none' | 'pending' | 'accepted' | 'rejected'> {
    if (!isSupabaseConfigured()) return 'none';

    const { data } = await supabase
      .from('team_invitations')
      .select('status')
      .match({ team_id: teamId, invitee_id: inviteeId })
      .maybeSingle();

    return (data?.status as any) || 'none';
  },

  /** Get invite statuses for multiple invitees in one team (for captain view) */
  async getTeamInviteStatuses(teamId: string): Promise<Record<string, 'pending' | 'accepted' | 'rejected'>> {
    if (!isSupabaseConfigured()) return {};

    const { data } = await supabase
      .from('team_invitations')
      .select('invitee_id, status')
      .eq('team_id', teamId);

    const map: Record<string, any> = {};
    (data || []).forEach((r: any) => { map[r.invitee_id] = r.status; });
    return map;
  },

  /** Search platform users by name, email, or PNR (for captain's invite modal) */
  async searchPlatformUsers(query: string): Promise<import('../mocks/types').PlatformUserSearchResult[]> {
    if (!isSupabaseConfigured() || !query.trim()) return [];

    const q = query.trim().toLowerCase();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, contact_email, pnr, branch, class_year, division, avatar_url')
      .or(`name.ilike.%${q}%,contact_email.ilike.%${q}%,pnr.ilike.%${q}%`)
      .limit(20);

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      name: p.name || 'Unknown',
      email: p.contact_email || '',
      pnr: p.pnr || '',
      branch: p.branch || '',
      classYear: p.class_year || '',
      division: p.division || '',
      avatarUrl: p.avatar_url || '',
    }));
  },

  /** Count pending invitations for the current user (for nav badge) */
  async getPendingInviteCount(userId: string): Promise<number> {
    if (!isSupabaseConfigured() || !userId) return 0;

    const { count } = await supabase
      .from('team_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('invitee_id', userId)
      .eq('status', 'pending');

    return count ?? 0;
  },
};



