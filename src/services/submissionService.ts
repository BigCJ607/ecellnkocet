import type { Submission } from '../mocks/types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const mapDbSubmission = (row: any): Submission => ({
  id: row.id,
  teamId: row.team_id || row.teamId,
  eventId: row.event_id || row.eventId,
  repoUrl: row.repo_url || row.repoUrl || '',
  fileName: row.file_name || row.fileName,
  fileSize: row.file_size ? Number(row.file_size) : row.fileSize,
  description: row.description || '',
  timestamp: row.timestamp || row.created_at,
});

export const submissionService = {
  async getSubmissions(eventId: string): Promise<Submission[]> {
    // Always include local submissions (works without Supabase too)
    let localSubs: Submission[] = [];
    try {
      const key = `tiredboss_submissions_${eventId}`;
      localSubs = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) { /* ignore */ }

    if (!isSupabaseConfigured() || !eventId) {
      return localSubs;
    }

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    if (error || !data) {
      console.warn('Supabase getSubmissions error:', error);
      return localSubs;
    }

    const dbSubs = data.map(mapDbSubmission);
    // Merge: db wins over local for same teamId
    const dbTeamIds = new Set(dbSubs.map(s => s.teamId));
    const onlyLocalSubs = localSubs.filter(s => !dbTeamIds.has(s.teamId));
    return [...dbSubs, ...onlyLocalSubs];
  },

  /** URL/text-based submission */
  async submitCode(teamId: string, eventId: string, repoUrl: string, description: string): Promise<Submission> {
    if (!isSupabaseConfigured()) {
      throw new Error('Please configure Supabase in .env to submit deliverables.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      teamId,
      eventId,
      repoUrl,
      description,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from('submissions').insert({
      id: newSub.id,
      team_id: teamId,
      event_id: eventId,
      user_id: userId,
      repo_url: repoUrl,
      description,
      timestamp: newSub.timestamp,
    });

    if (error) {
      throw new Error(error.message);
    }

    return newSub;
  },

  /** URL submission — works with or without Supabase, falls back to localStorage */
  async submitCodeOrLocal(teamId: string, eventId: string, repoUrl: string, description: string): Promise<Submission> {
    if (isSupabaseConfigured()) {
      try {
        return await this.submitCode(teamId, eventId, repoUrl, description);
      } catch (err: any) {
        console.warn('Supabase submitCode failed, using local fallback:', err?.message);
      }
    }
    const newSub: Submission = {
      id: `sub-local-${Date.now()}`,
      teamId, eventId, repoUrl, description,
      timestamp: new Date().toISOString(),
    };
    try {
      const key = `tiredboss_submissions_${eventId}`;
      const existing: Submission[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter(s => s.teamId !== teamId);
      filtered.push(newSub);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) { /* ignore */ }
    return newSub;
  },

  /**
   * Zip-file upload submission.
   * Uploads file to Supabase Storage and inserts database record.
   */
  /** Works with or without Supabase — falls back to localStorage when not configured */
  async submitZipOrLocal(
    teamId: string,
    eventId: string,
    file: File,
    description: string
  ): Promise<Submission> {
    if (isSupabaseConfigured()) {
      try {
        return await this.submitZip(teamId, eventId, file, description);
      } catch (err: any) {
        // If Supabase fails (e.g. FK constraint, storage not set up), fall through to local
        console.warn('Supabase submitZip failed, using local fallback:', err?.message);
      }
    }

    // Local fallback — store metadata in localStorage, file stays in memory
    const newSub: Submission = {
      id: `sub-local-${Date.now()}`,
      teamId,
      eventId,
      repoUrl: '',
      fileName: file.name,
      fileSize: file.size,
      description,
      timestamp: new Date().toISOString(),
    };

    try {
      const key = `tiredboss_submissions_${eventId}`;
      const existing: Submission[] = JSON.parse(localStorage.getItem(key) || '[]');
      // replace existing submission from same team
      const filtered = existing.filter(s => s.teamId !== teamId);
      filtered.push(newSub);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.warn('localStorage submission save error:', e);
    }

    return newSub;
  },

  async submitZip(
    teamId: string,
    eventId: string,
    file: File,
    description: string
  ): Promise<Submission> {
    if (!isSupabaseConfigured()) {
      throw new Error('Please configure Supabase in .env to upload project deliverables.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    let fileUrl = '';
    const filePath = `${eventId}/${teamId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('submissions').getPublicUrl(filePath);
      fileUrl = data.publicUrl;
    } else {
      console.warn('Storage upload warning:', uploadError);
    }

    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      teamId,
      eventId,
      repoUrl: fileUrl || file.name,
      fileName: file.name,
      fileSize: file.size,
      description,
      timestamp: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('submissions').insert({
      id: newSub.id,
      team_id: teamId,
      event_id: eventId,
      user_id: userId,
      repo_url: fileUrl || file.name,
      file_name: file.name,
      file_size: file.size,
      file_url: fileUrl || null,
      description,
      timestamp: newSub.timestamp,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newSub;
  },

  /** Delete a submission by its ID. Works for both Supabase and localStorage. */
  async deleteSubmission(submissionId: string, eventId: string): Promise<boolean> {
    // Remove from Supabase
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionId);

      if (error) {
        console.warn('Supabase deleteSubmission error:', error);
        // Fall through to also clean localStorage
      }
    }

    // Always clean localStorage too (covers local fallback)
    try {
      const key = `tiredboss_submissions_${eventId}`;
      const existing: Submission[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter(s => s.id !== submissionId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) { /* ignore */ }

    return true;
  }
};
