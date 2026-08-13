import type { UserProfile } from '../mocks/types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const mapDbProfile = (row: any): UserProfile => {
  const rawAvatar = row.avatar_url || row.avatarUrl || '';
  const cleanAvatar = rawAvatar && !rawAvatar.includes('pravatar.cc')
    ? rawAvatar
    : '';

  return {
    userId: row.id,
    name: row.name || '',
    pnr: row.pnr || '',
    classYear: row.class_year || row.classYear || 'First Year',
    division: row.division || '',
    branch: row.branch || '',
    contactEmail: row.contact_email || row.contactEmail || '',
    bio: row.bio || '',
    avatarUrl: cleanAvatar,
    avatarLocalUrl: row.avatarLocalUrl,
    role: row.role || 'student',
    createdAt: row.created_at,
  };
};

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured() || !userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapDbProfile(data);
  },

  async updateProfile(userId: string, updates: Partial<Omit<UserProfile, 'userId'>>): Promise<UserProfile> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please configure .env to save profile updates.');
    }

    const dbPayload: Record<string, any> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.pnr !== undefined) dbPayload.pnr = updates.pnr;
    if (updates.classYear !== undefined) dbPayload.class_year = updates.classYear;
    if (updates.division !== undefined) dbPayload.division = updates.division;
    if (updates.branch !== undefined) dbPayload.branch = updates.branch;
    if (updates.contactEmail !== undefined) dbPayload.contact_email = updates.contactEmail;
    if (updates.bio !== undefined) dbPayload.bio = updates.bio;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    if (updates.role !== undefined) dbPayload.role = updates.role;

    const { data, error } = await supabase
      .from('profiles')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapDbProfile(data);
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!isSupabaseConfigured()) {
      return URL.createObjectURL(file);
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.warn('Avatar upload to Supabase storage failed, using local URL:', uploadError);
      return URL.createObjectURL(file);
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  }
};
