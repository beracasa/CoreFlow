
import { supabase } from './supabaseClient';
import { UserProfile, UserRole } from '../../types';

export const UserSupabaseService = {
  // Get all users (profiles)
  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) throw error;

    // Map snake_case DB to camelCase UI if needed, or keep as is if types match
    return data.map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name || '',
      role: p.role as UserRole,
      job_title: p.job_title || '',
      tenant_id: p.tenant_id,
      status: p.status,
      // Handle array or null
      specialties: p.specialties || [],
      avatar_url: p.avatar_url,
      company_code: p.company_code // New field
    }));
  },

  // Invite user (Mock implementation for now as Supabase Invite requires Admin API)
  // For now we just create a profile row if we want to "reserve" a spot, or we skipping auth
  // In a real app we'd call an Edge Function to supabase.auth.admin.inviteUserByEmail
  async inviteUser(email: string, fullName: string, role: string, jobTitle: string, companyCode?: string): Promise<UserProfile> {
    // 1. Create a dummy ID or use a real flow
    // For this demo, we'll insert into profiles directly assuming the user will claim it? 
    // OR more likely, we just assume the user exists in Auth and we create the profile.

    // NOTE: In client-side only, we can't easily create an Auth user without signing them up.
    // We will simulate invitation by creating a profile row with status 'INVITED' and a generated ID.
    // When the user actually signs up, they get a new ID. This is a common disconnect.
    // Ideally, use an Edge Function. Here we will just insert to `profiles` to show in UI.

    const fakeId = crypto.randomUUID();

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: fakeId, // This will fail if foreign key constraint to auth.users is strict and user doesn't exist
        email,
        full_name: fullName,
        role,
        job_title: jobTitle,
        status: 'INVITED',
        specialties: [],
        company_code: companyCode
      })
      .select()
      .single();

    if (error) {
      console.warn("Could not create profile without auth user (FK constraint?). Using mock response for UI.");
      // Fallback for UI demo if DB constraints prevent orphan profiles
      return {
        id: fakeId,
        email,
        full_name: fullName,
        role,
        job_title: jobTitle,
        tenant_id: 't1',
        status: 'INVITED',
        specialties: [],
        company_code: companyCode
      };
    }

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role as UserRole,
      job_title: data.job_title,
      tenant_id: data.tenant_id,
      status: data.status,
      specialties: data.specialties || [],
      company_code: data.company_code
    };
  },

  // Update User Profile
  async updateUser(user: UserProfile): Promise<void> {
    console.log("[UserSupabaseService] Updating user:", user);
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: user.full_name,
        role: user.role, // Ensure this is being sent
        job_title: user.job_title,
        status: user.status,
        specialties: user.specialties,
        company_code: user.company_code
      })
      .eq('id', user.id)
      .select();

    if (error) {
      console.error("[UserSupabaseService] Update failed:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error("[UserSupabaseService] Update returned no data. Possible RLS blocking.");
      throw new Error("Update failed: No permission to modify this user.");
    }

    console.log("[UserSupabaseService] Update successful. New data:", data);
  },

  // Delete User (Profile)
  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
