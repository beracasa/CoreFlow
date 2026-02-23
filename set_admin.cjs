require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// IMPORTANTE: Asegúrate de tener temporalmente SUPABASE_SERVICE_ROLE_KEY exportado o pegado aquí si .env.local no lo tiene
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdmin() {
    console.log("Conectando a Supabase...");

    // 1. Obtener todos los roles
    const { data: roles, error: roleErr } = await supabase.from('app_roles').select('*');
    if (roleErr) {
        console.error("Error obteniendo roles:", roleErr);
        return;
    }

    // Encontrar el rol Administrador
    const adminRole = roles.find(r => r.name.toLowerCase().includes('admin'));
    if (!adminRole) {
        console.error("No se encontró un rol de Administrador en app_roles.");
        console.log("Roles disponibles:", roles.map(r => r.name));
        return;
    }
    console.log(`✅ Rol Administrador encontrado. ID: ${adminRole.id} (${adminRole.name})`);

    // 2. Obtener todos los perfiles de usuarios
    const { data: profiles, error: perfErr } = await supabase.from('profiles').select('*');
    if (perfErr) {
        console.error("Error obteniendo perfiles:", perfErr);
        return;
    }

    if (profiles.length === 0) {
        console.error("❌ No hay perfiles creados (tu usuario sigue siendo fantasma). Corre el script de Emergencia SQL primero.");
        return;
    }

    // Asumiendo que quieres darle Admin al primer usuario que aparezca o filtrando por tu email si quieres:
    // Si quieres uno específico cambia esto: const myUser = profiles.find(p => p.email === 'tu@correo.com');
    const myUser = profiles[0];
    console.log(`👤 Usuario a actualizar: ${myUser.full_name} (${myUser.email}) - Rol Actual: ${myUser.role_id}`);

    // 3. Actualizar
    const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role_id: adminRole.id })
        .eq('id', myUser.id);

    if (updateErr) {
        console.error("❌ Error actualizando perfil:", updateErr);
    } else {
        console.log(`🎉 ¡ÉXITO! El rol de Administrador ha sido asignado a ${myUser.full_name}.`);
        console.log("Por favor, cierra sesión y vuelve a entrar en la App web.");
    }
}

setAdmin();
