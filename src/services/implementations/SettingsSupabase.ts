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

type DbSettingsSource = 'general_settings' | 'plant_settings' | 'defaults';

const isNoRowsError = (error: any) => error?.code === 'PGRST116';

const isMissingTableError = (error: any) => {
    const code = String(error?.code || '');
    const message = String(error?.message || '').toLowerCase();
    // PostgREST commonly surfaces "42P01" for undefined_table.
    return code === '42P01' || message.includes('does not exist') || message.includes('relation') && message.includes('does not exist');
};

const fromPlantSettingsRow = (data: any): GeneralSettings => ({
    plantName: data?.plant_name || '',
    // The legacy `plant_settings` table stores RNC, not tax_id.
    taxId: data?.rnc || '',
    address: '',
    logoUrl: data?.logo_url || '',
    currency: data?.currency || 'DOP',
    timezone: data?.timezone || 'AST'
});

export const SettingsSupabaseService = {
    /**
     * Get the singleton settings record
     * Returns default values if no record exists (instead of throwing error)
     */
    async getSettings(): Promise<GeneralSettings> {
        // Prefer the newer `general_settings` table; fall back to legacy `plant_settings`
        // so staging environments that only have the old schema still persist settings.
        let source: DbSettingsSource = 'defaults';

        const general = await supabase.from('general_settings').select('*').single();
        if (!general.error && general.data) {
            source = 'general_settings';
            return {
                plantName: general.data.plant_name || '',
                taxId: general.data.tax_id || '',
                address: general.data.address || '',
                logoUrl: general.data.logo_url || '',
                currency: general.data.currency || 'DOP',
                timezone: general.data.timezone || 'AST'
            };
        }

        if (general.error && !isNoRowsError(general.error) && !isMissingTableError(general.error)) {
            console.error('Error fetching settings from general_settings:', general.error);
            throw general.error;
        }

        const plant = await supabase.from('plant_settings').select('*').single();
        if (!plant.error && plant.data) {
            source = 'plant_settings';
            return fromPlantSettingsRow(plant.data);
        }

        if (plant.error && !isNoRowsError(plant.error) && !isMissingTableError(plant.error)) {
            console.error('Error fetching settings from plant_settings:', plant.error);
            throw plant.error;
        }

        if (source !== 'defaults') {
            console.warn(`No settings rows found in database (${source}), returning defaults`);
        } else {
            console.warn('No settings tables/rows found in database, returning defaults');
        }
        return DEFAULT_SETTINGS;
    },

    /**
     * Update the singleton settings record
     * Uses upsert to ensure we always update the same record (id = true)
     */
    async updateSettings(settings: GeneralSettings): Promise<void> {
        // Try newer schema first
        const general = await supabase.from('general_settings').upsert(
            {
                id: true, // Force singleton ID
                plant_name: settings.plantName,
                tax_id: settings.taxId,
                address: settings.address,
                logo_url: settings.logoUrl,
                currency: settings.currency,
                timezone: settings.timezone,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
        );

        if (!general.error) return;
        if (!isMissingTableError(general.error)) {
            console.error('Error updating settings (general_settings):', general.error);
            throw general.error;
        }

        // Fallback for legacy schema (`plant_settings` uses id=1 and rnc)
        const plant = await supabase.from('plant_settings').upsert({
            id: 1,
            plant_name: settings.plantName,
            rnc: settings.taxId,
            timezone: settings.timezone,
            currency: settings.currency,
            logo_url: settings.logoUrl,
            updated_at: new Date().toISOString()
        });

        if (plant.error) {
            console.error('Error updating settings (plant_settings fallback):', plant.error);
            throw plant.error;
        }
    }
};
