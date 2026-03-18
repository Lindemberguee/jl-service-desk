
CREATE TABLE public.platform_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'sistema',
  is_active boolean NOT NULL DEFAULT true,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_manage_email_templates" ON public.platform_email_templates
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Seed default templates
INSERT INTO public.platform_email_templates (slug, name, subject, category, description, variables, html_body) VALUES
(
  'welcome',
  'Boas-vindas',
  'Bem-vindo ao Ordfy, {{admin_name}}! 🎉',
  'onboarding',
  'Enviado quando uma nova empresa se cadastra na plataforma.',
  '[{"key":"company_name","label":"Nome da Empresa","example":"Acme Corp"},{"key":"admin_name","label":"Nome do Admin","example":"João Silva"},{"key":"admin_email","label":"E-mail do Admin","example":"joao@acme.com"},{"key":"plan","label":"Plano","example":"Starter"},{"key":"trial_days","label":"Dias de Trial","example":"14"},{"key":"login_url","label":"URL de Login","example":"https://app.ordfy.com.br/login"}]',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a56db,#0f172a);padding:40px 40px 30px;text-align:center;">
          <img src="https://jl-service-desk.lovable.app/ordfy-logo.png" alt="Ordfy" height="40" style="margin-bottom:20px;filter:brightness(0) invert(1);">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Bem-vindo ao Ordfy! 🎉</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Sua plataforma de gestão está pronta para uso.</p>
        </td></tr>
        <tr><td style="padding:36px 40px 20px;">
          <p style="margin:0 0 20px;color:#1e293b;font-size:15px;line-height:1.6;">Olá <strong>{{admin_name}}</strong>,</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.7;">A empresa <strong>{{company_name}}</strong> foi cadastrada com sucesso na plataforma Ordfy.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:24px;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Dados de Acesso</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:100px;">E-mail:</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">{{admin_email}}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Plano:</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">{{plan}} ({{trial_days}} dias grátis)</td></tr>
              </table>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 28px;">
              <a href="{{login_url}}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1a56db,#2563eb);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">Acessar Ordfy →</a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
          <p style="margin:0 0 16px;color:#1e293b;font-size:14px;font-weight:600;">Primeiros passos:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.6;"><span style="display:inline-block;width:24px;height:24px;background:#eff6ff;color:#1a56db;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">1</span>Configure os departamentos da sua empresa</td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.6;"><span style="display:inline-block;width:24px;height:24px;background:#eff6ff;color:#1a56db;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">2</span>Cadastre os membros da sua equipe</td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.6;"><span style="display:inline-block;width:24px;height:24px;background:#eff6ff;color:#1a56db;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">3</span>Crie sua primeira ordem de serviço</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">Este e-mail foi enviado automaticamente pela plataforma Ordfy.<br>Se você não solicitou este cadastro, ignore esta mensagem.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
),
(
  'trial_expiring',
  'Trial Expirando',
  'Seu período de teste está acabando, {{admin_name}}',
  'lifecycle',
  'Enviado 3 dias antes do término do trial.',
  '[{"key":"company_name","label":"Nome da Empresa","example":"Acme Corp"},{"key":"admin_name","label":"Nome do Admin","example":"João Silva"},{"key":"days_remaining","label":"Dias Restantes","example":"3"},{"key":"upgrade_url","label":"URL de Upgrade","example":"https://app.ordfy.com.br/upgrade"}]',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:40px 40px 30px;text-align:center;">
          <img src="https://jl-service-desk.lovable.app/ordfy-logo.png" alt="Ordfy" height="40" style="margin-bottom:20px;filter:brightness(0) invert(1);">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">⏳ Seu trial expira em {{days_remaining}} dias</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Olá <strong>{{admin_name}}</strong>,</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.7;">O período de teste da <strong>{{company_name}}</strong> está chegando ao fim. Para continuar usando todos os recursos sem interrupção, escolha um plano.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 20px;">
              <a href="{{upgrade_url}}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">Escolher Plano →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">Plataforma Ordfy · E-mail automático</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
),
(
  'test',
  'Teste SMTP',
  '✅ Teste SMTP - Ordfy',
  'sistema',
  'Template usado para testar a configuração SMTP.',
  '[{"key":"sent_at","label":"Data/Hora","example":"18/03/2026 14:30"}]',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;">✅ SMTP Configurado!</h1>
        </td></tr>
        <tr><td style="padding:30px;text-align:center;">
          <p style="margin:0 0 8px;color:#1e293b;font-size:15px;font-weight:600;">Teste de e-mail realizado com sucesso.</p>
          <p style="margin:0;color:#64748b;font-size:13px;">Sua configuração SMTP da plataforma Ordfy está funcionando corretamente.</p>
          <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;">Enviado em {{sent_at}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
),
(
  'password_reset',
  'Redefinição de Senha',
  'Redefina sua senha - Ordfy',
  'auth',
  'Enviado quando o usuário solicita redefinição de senha.',
  '[{"key":"user_name","label":"Nome do Usuário","example":"Maria"},{"key":"reset_url","label":"URL de Reset","example":"https://app.ordfy.com.br/reset?token=abc123"}]',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:''Segoe UI'',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:40px 40px 30px;text-align:center;">
          <img src="https://jl-service-desk.lovable.app/ordfy-logo.png" alt="Ordfy" height="40" style="margin-bottom:20px;filter:brightness(0) invert(1);">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🔐 Redefinição de Senha</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Olá <strong>{{user_name}}</strong>,</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.7;">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 28px;">
              <a href="{{reset_url}}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;box-shadow:0 4px 14px rgba(99,102,241,0.35);">Redefinir Senha →</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Se você não solicitou esta alteração, ignore este e-mail. O link expira em 1 hora.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">Plataforma Ordfy · E-mail automático</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'
);
