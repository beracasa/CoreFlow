import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from "npm:resend"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, email, fullName, roleId, jobTitle, companyCode, specialties, tenantId, redirectTo } = body

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // =========================================================================
    // CASE 1: RECUPERACIÓN / RESTABLECIMIENTO DE CONTRASEÑA (RESEND)
    // =========================================================================
    if (action === 'reset_password') {
      console.log("=== RESET PASSWORD START ===", email);

      if (!email) {
        throw new Error('El correo electrónico es requerido para recuperar la contraseña.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      const rawAppUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://coreflow-six.vercel.app';
      const appUrl = rawAppUrl.startsWith('http') ? rawAppUrl : `https://${rawAppUrl}`;
      const rawRedirect = redirectTo || `${appUrl}/change-password`;
      const targetRedirect = rawRedirect.startsWith('http') ? rawRedirect : `https://${rawRedirect}`;

      // Buscar perfil para obtener el nombre y marcar requires_password_change
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      const recipientName = profileData?.full_name || normalizedEmail.split('@')[0];

      // Generar enlace oficial de recuperación con Supabase Admin API
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo: targetRedirect,
        },
      });

      if (linkError || !linkData?.properties?.action_link) {
        console.error("Error generating recovery link:", linkError?.message);
        throw new Error(linkError?.message || 'No se pudo generar el enlace de recuperación para este correo.');
      }

      // Construir enlace directo a nuestra app (/change-password?token_hash=...&type=recovery)
      // para evitar el error de redirección cuando el Site URL de Supabase no tiene https://
      const actionLink = linkData.properties.action_link;
      const hashedToken =
        linkData.properties.hashed_token ||
        new URL(actionLink).searchParams.get('token') ||
        '';

      let recoveryLink = actionLink;
      if (hashedToken) {
        const directUrl = new URL(targetRedirect);
        directUrl.pathname = '/change-password';
        directUrl.search = '';
        directUrl.searchParams.set('token_hash', hashedToken);
        directUrl.searchParams.set('type', 'recovery');
        recoveryLink = directUrl.toString();
      }

      const targetUserId = profileData?.id || linkData.user?.id;

      // Marcar requires_password_change = true para asegurar redirección a /change-password
      // incluso si el Site URL de Supabase redirige a la raíz "/"
      if (targetUserId) {
        const { error: flagError } = await supabaseAdmin
          .from('profiles')
          .update({ requires_password_change: true })
          .eq('id', targetUserId);

        if (flagError) {
          console.warn("Non-fatal: could not set requires_password_change flag:", flagError.message);
        }
      }

      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) {
        throw new Error('RESEND_API_KEY no está configurada en el servidor.');
      }

      const resend = new Resend(resendKey);
      const textLines = [
        '============================================================',
        'COREFLOW 4.0 - SISTEMA DE MANTENIMIENTO INDUSTRIAL',
        'RECUPERACIÓN Y CAMBIO DE CONTRASEÑA',
        '============================================================',
        '',
        `Hola, ${recipientName},`,
        '',
        'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en CoreFlow 4.0.',
        '',
        'ENLACE SEGURO PARA CAMBIAR TU CONTRASEÑA:',
        '------------------------------------------------------------',
        recoveryLink,
        '------------------------------------------------------------',
        '',
        'INSTRUCCIONES:',
        '1. Haz clic en el enlace superior (o cópialo y pégalo en tu navegador).',
        '2. Ingresa y confirma tu nueva contraseña (mínimo 8 caracteres).',
        '3. Serás redirigido automáticamente al panel principal de CoreFlow.',
        '',
        'NOTA DE SEGURIDAD:',
        'Este enlace es de un solo uso. Si no solicitaste este cambio, puedes ignorar este mensaje.',
        '',
        '------------------------------------------------------------',
        'Este es un correo automático generado por el Sistema CoreFlow.',
        '© 2026 CoreFlow Industrial Systems. Todos los derechos reservados.',
      ];

      const { error: emailError } = await resend.emails.send({
        from: 'CoreFlow <notificaciones@ravicaribeinc.com>',
        to: normalizedEmail,
        subject: '🔐 Recuperación de Contraseña - CoreFlow 4.0',
        text: textLines.join('\n'),
      });

      if (emailError) {
        console.error("Error sending recovery email via Resend:", emailError);
        throw new Error(`Error al enviar el correo de recuperación: ${emailError.message}`);
      }

      console.log("=== RESET PASSWORD EMAIL SENT SUCCESSFULLY ===", normalizedEmail);
      return new Response(
        JSON.stringify({ success: true, emailSent: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // =========================================================================
    // CASE 2: CREACIÓN / INVITACIÓN DE USUARIO
    // =========================================================================
    console.log("=== CREATE USER START ===");
    console.log("Payload:", JSON.stringify({ email, fullName, roleId, jobTitle, companyCode, tenantId }));

    if (!email || !fullName || !roleId) {
      throw new Error('Faltan campos requeridos: email, fullName, roleId');
    }

    const generatedPassword = 'CF-' + Math.random().toString(36).slice(-6).toUpperCase();

    let userId;
    let isExistingUser = false;

    // 1. Crear o recuperar el usuario en Auth
    // El trigger on_auth_user_created crea un perfil básico automáticamente
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role_id: roleId,
        job_title: jobTitle || '',
        company_code: companyCode || '',
        specialties: specialties || [],
        tenant_id: tenantId || 'primary'
      }
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log(`User ${email} already exists in auth. Fetching user info...`);
        // Find existing user id from profiles or auth.users list
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingProfile) {
          userId = existingProfile.id;
          isExistingUser = true;
        } else {
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError && listData && listData.users) {
            const foundUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (foundUser) {
              userId = foundUser.id;
              isExistingUser = true;
            }
          }
        }

        if (userId) {
          console.log(`Found existing user ID: ${userId}. Updating user metadata and password...`);
          // Update password and metadata for existing user to allow login/access
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: generatedPassword,
            user_metadata: {
              full_name: fullName,
              role_id: roleId,
              job_title: jobTitle || '',
              company_code: companyCode || '',
              specialties: specialties || [],
              tenant_id: tenantId || 'primary'
            }
          });
          if (updateError) {
            console.error("Failed to update existing auth user metadata:", updateError.message);
          }
        }
      }

      if (!userId) {
        console.error("Auth error:", authError.message);
        throw new Error("AUTH_ERROR: " + authError.message);
      }
    } else {
      userId = authData.user.id;
      console.log("Auth user created:", userId);
    }

    // 2. Esperar 500ms para que el trigger DB complete el INSERT inicial
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Usar RPC update_user_profile para actualizar el perfil sin conflictos de constraints
    // Esta función hace un UPDATE directo por id, evitando problemas con UNIQUE en email
    console.log("Calling RPC update_user_profile...");
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('update_user_profile', {
        p_user_id:                userId,
        p_full_name:              fullName,
        p_role_id:                roleId,
        p_job_title:              jobTitle || '',
        p_company_code:           companyCode || '',
        p_specialties:            specialties || [],
        p_tenant_id:              tenantId || 'primary',
        p_status:                 'INVITED',
        p_requires_password_change: true
      });

    if (rpcError) {
      console.error("RPC error:", JSON.stringify(rpcError));
      // Fallback: intentar upsert directo con onConflict explícito
      console.log("Trying direct upsert fallback...");
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id:                     userId,
          email:                  email,
          full_name:              fullName,
          role_id:                roleId,
          job_title:              jobTitle || '',
          company_code:           companyCode || '',
          specialties:            specialties || [],
          tenant_id:              tenantId || 'primary',
          status:                 'INVITED',
          requires_password_change: true
        }, { onConflict: 'id' })
        .select();

      if (upsertError) {
        console.error("Upsert fallback failed:", JSON.stringify(upsertError));
        throw new Error("PROFILE_ERROR: " + upsertError.message + " | code: " + upsertError.code);
      }
      console.log("Profile saved via upsert fallback:", JSON.stringify(upsertData));
    } else {
      console.log("Profile updated via RPC:", JSON.stringify(rpcData));
    }

    // 4. Enviar correo con Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const resend = new Resend(resendKey);
      const textLines = [
        '============================================================',
        'COREFLOW 4.0 - SISTEMA DE MANTENIMIENTO INDUSTRIAL',
        'BIENVENIDA E INVITACIÓN A LA PLATAFORMA',
        '============================================================',
        '',
        `Hola, ${fullName},`,
        '',
        'Has sido invitado a la plataforma de Mantenimiento y Gestión de Repuestos CoreFlow 4.0.',
        '',
        'CREDENCIALES DE ACCESO:',
        '------------------------------------------------------------',
        `• Usuario:                ${email}`,
        `• Contraseña Provisional: ${generatedPassword}`,
        '------------------------------------------------------------',
        '',
        'ENLACE DE ACCESO A LA PLATAFORMA:',
        'https://coreflow-six.vercel.app/',
        '',
        'NOTA DE SEGURIDAD:',
        'Por seguridad, el sistema te pedirá cambiar esta contraseña al iniciar sesión por primera vez.',
        '',
        '------------------------------------------------------------',
        '¡Bienvenido a CoreFlow 4.0!',
        '© 2026 CoreFlow Industrial Systems. Todos los derechos reservados.',
      ];

      const { error: emailError } = await resend.emails.send({
        from: 'CoreFlow <notificaciones@ravicaribeinc.com>',
        to: email,
        subject: 'Bienvenido a CoreFlow 4.0',
        text: textLines.join('\n'),
      });

      if (emailError) {
        console.error("Email error (non-fatal):", emailError);
        return new Response(
          JSON.stringify({ success: true, emailSent: false, warning: emailError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    console.log("=== CREATE USER SUCCESS ===");
    return new Response(
      JSON.stringify({ success: true, emailSent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("=== CREATE USER ERROR ===", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
