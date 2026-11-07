import { AppError } from '../errors/AppError.js'

/** Gera código numérico de 6 dígitos. */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * Envia e-mail de verificação usando a API HTTPS do EmailJS.
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const config = {
    serviceId: process.env.EMAILJS_SERVICE_ID?.trim(),
    templateId: process.env.EMAILJS_TEMPLATE_ID?.trim(),
    publicKey: process.env.EMAILJS_PUBLIC_KEY?.trim(),
    privateKey: process.env.EMAILJS_PRIVATE_KEY?.trim(),
  }
  const missing: string[] = []
  if (!config.serviceId) missing.push('EMAILJS_SERVICE_ID')
  if (!config.templateId) missing.push('EMAILJS_TEMPLATE_ID')
  if (!config.publicKey) missing.push('EMAILJS_PUBLIC_KEY')
  if (!config.privateKey) missing.push('EMAILJS_PRIVATE_KEY')

  if (missing.length === 4 && process.env.NODE_ENV !== 'production') {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📧 [EmailService - DEV MODE (Sem EmailJS)]`)
    console.log(`   Para: ${to}`)
    console.log(`   Código: ${code}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
    return
  }

  if (missing.length > 0) {
    throw new AppError(`Serviço de e-mail não configurado. Defina: ${missing.join(', ')}.`, 500)
  }

  try {
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

    console.log(`[EmailService] E-mail de verificação enviado com sucesso para ${to}.`)
  } catch (err: unknown) {
    if (err instanceof AppError) throw err
    const message = err instanceof Error ? err.message : String(err)
    console.error('[EmailJS Exception]', err)
    throw new AppError(`Falha ao enviar e-mail: ${message}`, 500)
  }
}
