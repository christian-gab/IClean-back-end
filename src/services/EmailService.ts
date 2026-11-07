import { Resend } from 'resend'
import { AppError } from '../errors/AppError.js'

function getHtmlTemplate(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 700; color: #15803d;">
          🌱 IClean
        </span>
      </div>
      <div style="background: white; border-radius: 10px; padding: 32px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">Verificação de e-mail</h2>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.5;">
          Use o código abaixo para confirmar seu e-mail e criar sua conta no IClean.
        </p>
        <div style="display: inline-block; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px; padding: 16px 32px; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #15803d;">${code}</span>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Expira em <strong>10 minutos</strong>. Se você não solicitou isso, ignore este e-mail.
        </p>
      </div>
    </div>
  `
}

/** Gera código numérico de 6 dígitos. */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * Envia e-mail de verificação usando a API HTTPS do Resend.
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()

  if (!resendApiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError(
        'Serviço de e-mail não configurado em produção. Adicione a RESEND_API_KEY nas variáveis de ambiente.',
        500
      )
    }

    // Modo dev sem API Key: exibe no console para facilitar testes locais
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📧 [EmailService - DEV MODE (Sem RESEND_API_KEY)]`)
    console.log(`   Para: ${to}`)
    console.log(`   Código: ${code}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
    return
  }

  try {
    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM?.trim() || 'IClean <onboarding@resend.dev>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: 'Seu código de verificação — IClean',
      text: `Seu código de verificação é: ${code}\n\nEle expira em 10 minutos. Se você não solicitou isso, ignore este e-mail.`,
      html: getHtmlTemplate(code),
    })

    if (error) {
      console.error('[Resend Error]', error)
      throw new AppError(`Falha ao enviar e-mail via Resend: ${error.message}`, 500)
    }

    console.log(`[EmailService] E-mail de verificação enviado com sucesso para ${to}. ID: ${data?.id}`)
  } catch (err: unknown) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Resend Exception]', err)
    throw new AppError(`Falha ao enviar e-mail: ${message}`, 500)
  }
}
