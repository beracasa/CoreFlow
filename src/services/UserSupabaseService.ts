
import { supabase } from './supabaseClient';
import { UserProfile, UserRole } from '../../types';

export const UserSupabaseService = {
  // Get all users (profiles) with notification preferences
  async getUsersWithPreferences(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, job_title, role, tenant_id, status, notification_preferences')
      .order('full_name');

    if (error) throw error;

    return data.map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name || '',
      role: p.role,
      job_title: p.job_title || '',
      tenant_id: p.tenant_id,
      status: p.status,
      notification_preferences: p.notification_preferences || {
        alerts_rmant05: false,
        low_stock: false,
        pending_approvals: false
      }
    }));
  },

  // Get all users (profiles)
  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, app_roles(name)')
      .order('full_name');

    if (error) throw error;

    // Map snake_case DB to camelCase UI if needed, or keep as is if types match
    return data.map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name || '',
      role: p.role_id || p.role, // map role_id from DB to role in UI. Fallback to role if migration is partial.
      roleName: p.app_roles?.name,
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
  async inviteUser(email: string, fullName: string, role: string, jobTitle: string, companyCode?: string, tenantId?: string): Promise<UserProfile> {
    console.log(`[UserSupabaseService] Inviting user: ${email} with role: ${role}, tenant: ${tenantId}`);
    
    // Call the Edge Function to send the invitation
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, fullName, roleId: role, tenantId }
    });

    if (error) {
      console.error("[UserSupabaseService] Invitation error:", error);
      throw error;
    }

    console.log("[UserSupabaseService] Invitation successful:", data);

    // Return the created user profile (from the function's response)
    const invitedUser = data.user;
    
    return {
      id: invitedUser.id,
      email: invitedUser.email,
      full_name: fullName,
      role: role as UserRole,
      job_title: jobTitle,
      tenant_id: 'primary',
      status: 'INVITED',
      specialties: [],
      company_code: companyCode
    };
  },

  // Invite user with provisional password
  async inviteUserWithPassword(email: string, fullName: string, roleId: string): Promise<any> {
    console.log(`[UserSupabaseService] Inviting user with password: ${email}`);
    
    // Call the NEW Edge Function
    const { data, error } = await supabase.functions.invoke('create-user-admin', {
      body: { email, fullName, roleId }
    });

    if (error) {
      console.error("Error nativo de invoke:", error);
      throw error;
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    return data;
  },

  // Update User Profile
  async updateUser(user: UserProfile): Promise<void> {
    console.log("[UserSupabaseService] Updating user:", user);
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: user.full_name,
        role_id: user.role, // Direct update to profiles using `role_id`
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
  },

  // Request a new skill/certification
  async createSkillRequest(userId: string, skillName: string): Promise<void> {
    console.log(`[UserSupabaseService] Creating skill request for user ${userId}: ${skillName}`);
    const { error } = await supabase
      .from('skill_requests')
      .insert({
        user_id: userId,
        skill_name: skillName,
        status: 'PENDING'
      });

    if (error) {
      console.error("[UserSupabaseService] Skill Request creation failed:", error);
      throw error;
    }
  },

  // Update a single user's notification preferences
  async updateUserNotificationPreferences(userId: string, preferences: any): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: preferences })
      .eq('id', userId);

    if (error) throw error;
  },

  // Bulk update notification preferences
  async bulkUpdateNotificationPreferences(updates: { userId: string, preferences: any }[]): Promise<void> {
    const promises = updates.map(update => 
      this.updateUserNotificationPreferences(update.userId, update.preferences)
    );
    
    await Promise.all(promises);
  }
};
