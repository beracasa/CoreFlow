import { supabase } from '../supabaseClient';

export interface GeneralSettings {
    plantName: string;
    taxId: string;
    address: string;
    logoUrl: string;
    currency: string;
    timezone: string;
}

const DEFAULT_SETTINGS: GeneralSettings = {
    plantName: '',
    taxId: '',
    address: '',
    logoUrl: '',
    currency: 'DOP',
    timezone: 'AST'
};

export const SettingsSupabaseService = {
    /**
     * Get the singleton settings record
     * Returns default values if no record exists (instead of throwing error)
     */
    async getSettings(): Promise<GeneralSettings> {
        const { data, error } = await supabase
            .from('general_settings')
            .select('*')
            .single();

        // PGRST116 = no rows returned
        if (error && error.code === 'PGRST116') {
            console.warn('No settings found in database, returning defaults');
            return DEFAULT_SETTINGS;
        }

        if (error) {
            console.error('Error fetching settings:', error);
            throw error;
        }

        // Map database columns to camelCase
        return {
            plantName: data.plant_name || '',
            taxId: data.tax_id || '',
            address: data.address || '',
            logoUrl: data.logo_url || '',
            currency: data.currency || 'DOP',
            timezone: data.timezone || 'AST'
        };
    },

    /**
     * Update the singleton settings record
     * Uses upsert to ensure we always update the same record (id = true)
     */
    async updateSettings(settings: GeneralSettings): Promise<void> {
        const { error } = await supabase
            .from('general_settings')
            .upsert({
                id: true, // Force singleton ID
                plant_name: settings.plantName,
                tax_id: settings.taxId,
                address: settings.address,
                logo_url: settings.logoUrl,
                currency: settings.currency,
                timezone: settings.timezone,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id' // Explicitly specify conflict column
            });

        if (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }
};
