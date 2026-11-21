import nodemailer from 'nodemailer'
import { AppError } from '../errors/AppError.js'

/** Gera código numérico de 6 dígitos. */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Gera o corpo do e-mail em HTML responsivo e profissional. */
export function buildVerificationEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - IClean</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); padding: 32px 28px;">
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <div style="display: inline-block; background-color: #ecfdf5; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center; font-size: 28px;">
                🌱
              </div>
              <h2 style="margin: 12px 0 4px 0; font-size: 22px; color: #065f46; font-weight: 700;">IClean</h2>
              <p style="margin: 0; font-size: 13px; color: #6b7280;">Pequenas ações fazem a diferença</p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #374151;">Olá!</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #4b5563;">
                Use o código abaixo para confirmar seu e-mail e criar sua conta no <strong>IClean</strong>:
              </p>
              
              <div style="background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #047857;">${code}</span>
              </div>
              
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; line-height: 20px;">
                ⏱️ Este código expira em <strong>10 minutos</strong>. Não compartilhe este código com ninguém.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 20px;">
                Se você não solicitou essa verificação, apenas ignore este e-mail.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="border-top: 1px solid #f3f4f6; margin-top: 24px; padding-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} IClean — Comunidade e Sustentabilidade
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

interface EmailJsConfig {
  serviceId: string
  templateId: string
  publicKey: string
  privateKey: string
}

async function sendViaEmailJs(config: EmailJsConfig, to: string, code: string): Promise<void> {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: config.templateId,
      user_id: config.publicKey,
      accessToken: config.privateKey,
      template_params: {
        to_email: to,
        verification_code: code,
      },
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new AppError(
      `Falha ao enviar e-mail via EmailJS: ${details || response.statusText}`,
      500
    )
  }

  console.log(`[EmailService] E-mail de verificação enviado com sucesso para ${to} via EmailJS.`)
}

/**
 * Envia e-mail de verificação.
 * Em ambientes como Render Free onde portas SMTP (25, 465, 587) são bloqueadas pelo firewall,
 * utiliza envio imediato via HTTPS (EmailJS) para evitar timeouts.
 * Em outros ambientes ou com SMTP_FORCE=true, utiliza envio prioritário via SMTP com timeout rápido e fallback.
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim()
  const smtpPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim()

  const emailJsConfig = {
    serviceId: process.env.EMAILJS_SERVICE_ID?.trim() || '',
    templateId: process.env.EMAILJS_TEMPLATE_ID?.trim() || '',
    publicKey: process.env.EMAILJS_PUBLIC_KEY?.trim() || '',
    privateKey: process.env.EMAILJS_PRIVATE_KEY?.trim() || '',
  }

  const hasSmtp = Boolean(smtpUser && smtpPass)
  const hasEmailJs = Boolean(
    emailJsConfig.serviceId &&
    emailJsConfig.templateId &&
    emailJsConfig.publicKey &&
    emailJsConfig.privateKey
  )

  if (!hasSmtp && !hasEmailJs) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📧 [EmailService - DEV MODE (Sem Provedor de E-mail)]`)
      console.log(`   Para: ${to}`)
      console.log(`   Código: ${code}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
      return
    }

    throw new AppError(
      'Serviço de e-mail não configurado. Defina SMTP_USER e SMTP_PASS (ou EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY).',
      500
    )
  }

  // No Render Free, as portas SMTP (25, 465, 587) são bloqueadas na rede da hospedagem.
  // Se estiver no Render e tiver EmailJS disponível, envia diretamente via HTTPS para resposta instantânea (< 2s).
  const isRenderFree = Boolean(process.env.RENDER) && process.env.SMTP_FORCE !== 'true'
  if (isRenderFree && hasEmailJs) {
    console.log('[EmailService] Ambiente Render detectado. Enviando via EmailJS (HTTPS) para evitar bloqueio de portas SMTP.')
    return sendViaEmailJs(emailJsConfig, to, code)
  }

  // 1. Envio via SMTP (Gmail / Nodemailer)
  if (hasSmtp) {
    try {
      const port = Number(process.env.SMTP_PORT || 465)
      const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : port === 465
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
        port,
        secure,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 5000,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      const from = process.env.SMTP_FROM?.trim() || `"IClean" <${smtpUser}>`
      const textContent = `Olá!\n\nUse o código abaixo para confirmar seu e-mail e criar sua conta no IClean:\n\n${code}\n\nEste código expira em 10 minutos. Não compartilhe este código com ninguém.\n\nSe você não solicitou essa verificação, ignore este e-mail.\n\nIClean — pequenas ações fazem a diferença.`

      await transporter.sendMail({
        from,
        to,
        subject: `Seu código de acesso ao IClean: ${code}`,
        text: textContent,
        html: buildVerificationEmailHtml(code),
      })

      console.log(`[EmailService] E-mail de verificação enviado com sucesso para ${to} via SMTP.`)
      return
    } catch (err: unknown) {
      if (err instanceof AppError) throw err
      const message = err instanceof Error ? err.message : String(err)
      console.error('[SMTP Exception]', err)

      // Se SMTP falhar (por exemplo, bloqueio de porta pela nuvem), realiza fallback automático para EmailJS
      if (hasEmailJs) {
        console.warn('[EmailService] SMTP falhou ou foi bloqueado pela hospedagem. Realizando fallback imediato para EmailJS via HTTPS...')
        return sendViaEmailJs(emailJsConfig, to, code)
      }

      throw new AppError(`Falha ao enviar e-mail via SMTP: ${message}`, 500)
    }
  }

  // 2. Envio direto via EmailJS
  return sendViaEmailJs(emailJsConfig, to, code)
}
